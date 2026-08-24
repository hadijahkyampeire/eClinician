package com.eclinician;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.eclinician.domains.dtos.AvailabilityRequest;
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

    private Instant atLocalHour(int hour) {
        return LocalDate.of(2026, 8, 24).atTime(hour, 0)
                .atZone(ZoneId.systemDefault()).toInstant();
    }
}
