package com.eclinician;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.eclinician.domains.dtos.request.AppointmentRequest;
import com.eclinician.domains.dtos.request.PatientRequest;
import com.eclinician.domains.dtos.response.AppointmentResponse;
import com.eclinician.domains.dtos.response.PatientResponse;
import com.eclinician.domains.enums.AppointmentStatus;
import com.eclinician.domains.enums.UserRole;
import com.eclinician.exceptions.ConflictException;
import com.eclinician.repositories.UserRepository;
import com.eclinician.services.AppointmentService;
import com.eclinician.services.PatientService;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

/** SRS use case 2: the scheduling and cancellation business rules. */
@SpringBootTest
@Transactional
class AppointmentSchedulingTests {

    private static final String TENANT = "scheduling-hospital";
    private static final Instant SLOT = Instant.parse("2026-09-01T09:00:00Z");

    @Autowired AppointmentService appointments;
    @Autowired PatientService patients;
    @Autowired UserRepository users;
    @Autowired TestAccounts accounts;

    @Test
    void aDoctorCannotHoldTwoAppointmentsAtTheSameTime() {
        UUID doctor = doctor();
        appointments.schedule(TENANT,
                new AppointmentRequest(patient("+256700910001").id(), doctor, SLOT, "Review", false));
        UUID second = patient("+256700910002").id();

        assertThatThrownBy(() -> appointments.schedule(TENANT,
                new AppointmentRequest(second, doctor, SLOT, "Review", false)))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("already has an appointment");
    }

    @Test
    void cancellingFreesTheDoctorsSlot() {
        UUID doctor = doctor();
        AppointmentResponse booked = appointments.schedule(TENANT,
                new AppointmentRequest(patient("+256700910003").id(), doctor, SLOT, "Review", false));

        assertThat(appointments.cancel(TENANT, booked.id()).status())
                .isEqualTo(AppointmentStatus.CANCELLED);
        assertThat(appointments.schedule(TENANT, new AppointmentRequest(
                patient("+256700910004").id(), doctor, SLOT, "Review", false)).id()).isNotNull();
    }

    @Test
    void anAppointmentThatHasTakenPlaceCannotBeCancelled() {
        PatientResponse mary = patient("+256700910005");
        AppointmentResponse visit = appointments.checkIn(TENANT,
                new AppointmentRequest(mary.id(), null, null, "Walk-in", false));
        appointments.startSession(TENANT, mary.id());
        appointments.complete(TENANT, visit.id());

        assertThatThrownBy(() -> appointments.cancel(TENANT, visit.id()))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("already taken place");
    }

    private UUID doctor() {
        return users.findByEmailIgnoreCase(accounts.create(TENANT, UserRole.CLINICIAN))
                .orElseThrow().getId();
    }

    private PatientResponse patient(String phone) {
        return patients.create(TENANT, new PatientRequest("Test", "Patient",
                LocalDate.of(1990, 1, 1), "Other", phone, null, null,
                null, null, null, null, "UG"));
    }
}
