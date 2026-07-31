package com.eclinician.appointment;

import static org.assertj.core.api.Assertions.assertThat;

import com.eclinician.patient.Patient;
import com.eclinician.patient.PatientRepository;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class AppointmentServiceTests {

    @Autowired
    private AppointmentService service;

    @Autowired
    private PatientRepository patients;

    @Test
    void completingVisitClearsActivePatientStatusButPreservesHistory() {
        Patient patient = new Patient();
        patient.setTenantId("workflow-test-hospital");
        patient.setFirstName("Test");
        patient.setLastName("Patient");
        patient.setDateOfBirth(LocalDate.of(1990, 1, 1));
        patient.setSex("Other");
        patient.setPhone("+256700000001");
        patient = patients.save(patient);

        AppointmentResponse checkedIn = service.checkIn(
                patient.getTenantId(),
                new AppointmentRequest(patient.getId(), null, "Walk-in"));
        assertThat(checkedIn.status()).isEqualTo(AppointmentStatus.CHECKED_IN);
        assertThat(patients.findById(patient.getId()).orElseThrow().getActiveCareStatus())
                .isEqualTo(PatientCareStatus.CHECKED_IN);

        AppointmentResponse waiting = service.markWaiting(
                patient.getTenantId(), checkedIn.id());
        assertThat(waiting.status()).isEqualTo(AppointmentStatus.WAITING);

        AppointmentResponse inSession = service.startSession(
                patient.getTenantId(), patient.getId());
        assertThat(inSession.status()).isEqualTo(AppointmentStatus.IN_SESSION);

        AppointmentResponse completed = service.complete(
                patient.getTenantId(), checkedIn.id());
        assertThat(completed.status()).isEqualTo(AppointmentStatus.COMPLETED);
        assertThat(completed.completedAt()).isNotNull();
        assertThat(patients.findById(patient.getId()).orElseThrow().getActiveCareStatus())
                .isNull();
        assertThat(service.list(patient.getTenantId(), patient.getId()))
                .singleElement()
                .extracting(AppointmentResponse::status)
                .isEqualTo(AppointmentStatus.COMPLETED);
    }
}
