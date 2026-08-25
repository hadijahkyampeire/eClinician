package com.eclinician;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.eclinician.domains.dtos.AvailabilityRequest;
import com.eclinician.domains.dtos.StaffRequest;
import com.eclinician.domains.entities.AppUser;
import com.eclinician.domains.enums.UserRole;
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
        staff.create("fresh-hospital", new StaffRequest(
                "Dr New", "new@rota.test", UserRole.CLINICIAN, "General", "a-long-password"));

        // The clinic's three shifts cover 08:00 to just before midnight, every day.
        assertThat(staff.clinicians("fresh-hospital", atLocalHour(9))).hasSize(1);
        assertThat(staff.clinicians("fresh-hospital", atLocalHour(15))).hasSize(1);
        assertThat(staff.clinicians("fresh-hospital", atLocalHour(22))).hasSize(1);
        // Sunday too — the old rota was Monday to Friday.
        assertThat(staff.clinicians("fresh-hospital", onSundayAt(10))).hasSize(1);
        // But not in the small hours, which nobody published.
        assertThat(staff.clinicians("fresh-hospital", atLocalHour(2))).isEmpty();
    }

    /** Non-clinical accounts have no rota to publish, and must not get one. */
    @Test
    void onlyClinicansGetARota() {
        staff.create("fresh-hospital", new StaffRequest(
                "Front Desk", "desk@rota.test", UserRole.RECEPTIONIST, null, "a-long-password"));

        assertThat(staff.clinicians("fresh-hospital", atLocalHour(9))).isEmpty();
    }

    /** Marking yourself unavailable: the default is replaced by whatever you publish. */
    @Test
    void publishingYourOwnRotaReplacesTheDefault() {
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

    private AppUser clinician(String tenant, String email) {
        AppUser user = new AppUser();
        user.setTenantId(tenant);
        user.setName("Dr Rota");
        user.setEmail(email);
        user.setPasswordHash("not-used");
        user.setRole(UserRole.CLINICIAN);
        user.setActive(true);
        return users.save(user);
    }

    /** 24 August 2026 is a Monday. */
    private Instant atLocalHour(int hour) {
        return LocalDate.of(2026, 8, 24).atTime(hour, 0)
                .atZone(ZoneId.systemDefault()).toInstant();
    }

    private Instant onSundayAt(int hour) {
        return LocalDate.of(2026, 8, 30).atTime(hour, 0)
                .atZone(ZoneId.systemDefault()).toInstant();
    }
}
