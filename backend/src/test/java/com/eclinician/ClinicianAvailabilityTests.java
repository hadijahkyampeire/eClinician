package com.eclinician;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.eclinician.domains.dtos.AvailabilityRequest;
import com.eclinician.domains.dtos.StaffRequest;
import com.eclinician.domains.entities.AppUser;
import com.eclinician.domains.entities.Tenant;
import com.eclinician.domains.enums.ClinicModule;
import com.eclinician.domains.enums.UserRole;
import com.eclinician.repositories.TenantRepository;
import com.eclinician.repositories.UserRepository;
import com.eclinician.services.ClinicianAvailabilityService;
import com.eclinician.services.StaffService;
import com.eclinician.web.ConflictException;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalTime;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class ClinicianAvailabilityTests {
    @Autowired ClinicianAvailabilityService availability;
    @Autowired StaffService staff;
    @Autowired UserRepository users;
    @Autowired TenantRepository tenants;

    @Test
    void publishedWeeklyHoursDriveTheTenantScopedReceptionistDropdown() {
        AppUser doctor = clinician("rota-hospital", "doctor@rota.test");
        clinician("other-hospital", "other@rota.test");
        AvailabilityRequest monday = new AvailabilityRequest(List.of(
                new AvailabilityRequest.Shift(DayOfWeek.MONDAY,
                        LocalTime.of(8, 0), LocalTime.of(17, 0), "Room A")));

        availability.replaceMine("rota-hospital", doctor.getEmail(), monday);

        assertThat(staff.clinicians("rota-hospital", atLocalHour(10)))
                .singleElement().satisfies(result -> {
                    assertThat(result.id()).isEqualTo(doctor.getId());
                    assertThat(result.consultationRoom()).isEqualTo("Room A");
                });
        assertThat(staff.clinicians("rota-hospital", atLocalHour(18)))
                .isEmpty();
        assertThatThrownBy(() -> availability.getMine("other-hospital", doctor.getEmail()))
                .isInstanceOf(com.eclinician.web.NotFoundException.class);
    }

    @Test
    void aShiftCannotEndBeforeItStarts() {
        AppUser doctor = clinician("invalid-rota-hospital", "invalid@rota.test");
        AvailabilityRequest invalid = new AvailabilityRequest(List.of(
                new AvailabilityRequest.Shift(DayOfWeek.TUESDAY,
                        LocalTime.of(17, 0), LocalTime.of(8, 0), "Room B")));

        assertThatThrownBy(() -> availability.replaceMine(
                doctor.getTenantId(), doctor.getEmail(), invalid))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("end time");
    }

    /**
     * The bug this fixes: a doctor added through the console had published nothing, and
     * reception only sees clinicians whose shift covers the booking time — so a new
     * hospital's doctors never appeared in the booking form at all.
     */
    @Test
    void aNewClinicianIsBookableTheMomentTheAccountExists() {
        hospital("fresh-hospital", "Africa/Kampala");
        staff.create("fresh-hospital", new StaffRequest(
                "Dr New", "new@rota.test", UserRole.CLINICIAN, "General", "a-long-password"));

        // The clinic's four shifts cover the whole day, every day.
        assertThat(staff.clinicians("fresh-hospital", atLocalHour(9))).hasSize(1);
        assertThat(staff.clinicians("fresh-hospital", atLocalHour(15))).hasSize(1);
        assertThat(staff.clinicians("fresh-hospital", atLocalHour(22))).hasSize(1);
        // Sunday too — the old rota was Monday to Friday.
        assertThat(staff.clinicians("fresh-hospital", onSundayAt(10))).hasSize(1);
        // And the small hours, which is when the gap was first noticed.
        assertThat(staff.clinicians("fresh-hospital", atLocalHour(0))).hasSize(1);
        assertThat(staff.clinicians("fresh-hospital", atLocalHour(2))).hasSize(1);
    }

    /**
     * The four shifts must meet exactly: no minute uncovered, and the last one has to
     * close the day rather than stopping a minute short of it.
     */
    @Test
    void everyMinuteOfTheDayIsCovered() {
        hospital("allhours-hospital", "Africa/Kampala");
        staff.create("allhours-hospital", new StaffRequest(
                "Dr Allhours", "allhours@rota.test", UserRole.CLINICIAN, null, "a-long-password"));

        for (int hour = 0; hour < 24; hour++) {
            assertThat(staff.clinicians("allhours-hospital", atLocalHour(hour)))
                    .as("clinicians at %02d:00", hour).hasSize(1);
        }
        // The boundaries themselves, where one shift hands over to the next.
        for (int[] at : new int[][] {{8, 0}, {14, 0}, {20, 0}, {23, 59}}) {
            assertThat(staff.clinicians("allhours-hospital", atLocal(at[0], at[1])))
                    .as("clinicians at %02d:%02d", at[0], at[1]).hasSize(1);
        }
    }

    /**
     * The bug behind "why is there no clinician": the rota was matched in the server's
     * timezone, one value for the whole platform. Two hospitals, one instant, two answers.
     */
    @Test
    void aRotaIsReadInTheHospitalsOwnZone() {
        hospital("kampala-hospital", "Africa/Kampala");
        hospital("boston-hospital", "America/New_York");
        AppUser inKampala = clinician("kampala-hospital", "kla@rota.test");
        AppUser inBoston = clinician("boston-hospital", "bos@rota.test");

        // A single morning shift at each, 08:00-12:00 local.
        AvailabilityRequest morning = new AvailabilityRequest(List.of(
                new AvailabilityRequest.Shift(DayOfWeek.MONDAY,
                        LocalTime.of(8, 0), LocalTime.of(12, 0), "Room A")));
        availability.replaceMine("kampala-hospital", inKampala.getEmail(), morning);
        availability.replaceMine("boston-hospital", inBoston.getEmail(), morning);

        // 06:00 UTC on that Monday: 09:00 in Kampala, but 02:00 in Boston.
        Instant sixUtc = LocalDate.of(2026, 8, 24).atTime(6, 0)
                .atZone(ZoneId.of("UTC")).toInstant();

        assertThat(staff.clinicians("kampala-hospital", sixUtc)).hasSize(1);
        assertThat(staff.clinicians("boston-hospital", sixUtc)).isEmpty();

        // 13:00 UTC is 09:00 in Boston and 16:00 in Kampala — the answers swap.
        Instant thirteenUtc = LocalDate.of(2026, 8, 24).atTime(13, 0)
                .atZone(ZoneId.of("UTC")).toInstant();
        assertThat(staff.clinicians("boston-hospital", thirteenUtc)).hasSize(1);
        assertThat(staff.clinicians("kampala-hospital", thirteenUtc)).isEmpty();
    }

    /** Non-clinical accounts have no rota to publish, and must not get one. */
    @Test
    void onlyClinicansGetARota() {
        hospital("fresh-hospital", "Africa/Kampala");
        staff.create("fresh-hospital", new StaffRequest(
                "Front Desk", "desk@rota.test", UserRole.RECEPTIONIST, null, "a-long-password"));

        assertThat(staff.clinicians("fresh-hospital", atLocalHour(9))).isEmpty();
    }

    /** Marking yourself unavailable: the default is replaced by whatever you publish. */
    @Test
    void publishingYourOwnRotaReplacesTheDefault() {
        hospital("quiet-hospital", "Africa/Kampala");
        staff.create("quiet-hospital", new StaffRequest(
                "Dr Quiet", "quiet@rota.test", UserRole.CLINICIAN, null, "a-long-password"));
        assertThat(staff.clinicians("quiet-hospital", atLocalHour(22))).hasSize(1);

        availability.replaceMine("quiet-hospital", "quiet@rota.test",
                new AvailabilityRequest(List.of(new AvailabilityRequest.Shift(
                        DayOfWeek.MONDAY, LocalTime.of(8, 0), LocalTime.of(14, 0), "Room A"))));

        assertThat(staff.clinicians("quiet-hospital", atLocalHour(10))).hasSize(1);
        assertThat(staff.clinicians("quiet-hospital", atLocalHour(22))).isEmpty();
    }

    /**
     * A day may hold more than one shift. The rota form used to assume exactly one and
     * replaced the whole week with what it held, so the extras were silently dropped.
     */
    @Test
    void aDayCanHoldSeveralShifts() {
        AppUser doctor = clinician("split-hospital", "split@rota.test");
        availability.replaceMine("split-hospital", doctor.getEmail(), new AvailabilityRequest(
                List.of(
                    new AvailabilityRequest.Shift(DayOfWeek.MONDAY,
                            LocalTime.of(8, 0), LocalTime.of(14, 0), "Room A"),
                    new AvailabilityRequest.Shift(DayOfWeek.MONDAY,
                            LocalTime.of(20, 0), LocalTime.of(23, 59), "Room A"))));

        assertThat(availability.getMine("split-hospital", doctor.getEmail())).hasSize(2);
        assertThat(staff.clinicians("split-hospital", atLocalHour(9))).hasSize(1);
        assertThat(staff.clinicians("split-hospital", atLocalHour(16))).isEmpty();
        assertThat(staff.clinicians("split-hospital", atLocalHour(21))).hasSize(1);
    }

    /**
     * A rota is read in the hospital's own zone, so a test about rotas has to say where
     * the hospital is. Kampala unless a test cares otherwise.
     */
    private void hospital(String id, String zone) {
        if (tenants.existsById(id)) return;
        Tenant value = new Tenant();
        value.setId(id);
        value.setName(id);
        value.setPrimaryColor("#0f766e");
        value.setModuleList(List.of(ClinicModule.values()));
        value.setTimeZone(zone);
        tenants.save(value);
    }

    private AppUser clinician(String tenant, String email) {
        hospital(tenant, "Africa/Kampala");
        AppUser user = new AppUser();
        user.setTenantId(tenant);
        user.setName("Dr Rota");
        user.setEmail(email);
        user.setPasswordHash("not-used");
        user.setRole(UserRole.CLINICIAN);
        user.setActive(true);
        return users.save(user);
    }

    /** 24 August 2026 is a Monday. Read in the clinic's zone, which defaults to Kampala. */
    private Instant atLocalHour(int hour) {
        return atLocal(hour, 0);
    }

    private Instant atLocal(int hour, int minute) {
        return LocalDate.of(2026, 8, 24).atTime(hour, minute)
                .atZone(ZoneId.of("Africa/Kampala")).toInstant();
    }

    private Instant onSundayAt(int hour) {
        return LocalDate.of(2026, 8, 30).atTime(hour, 0)
                .atZone(ZoneId.of("Africa/Kampala")).toInstant();
    }
}
