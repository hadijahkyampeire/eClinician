package com.eclinician.encounter;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.eclinician.appointment.AppointmentRequest;
import com.eclinician.appointment.AppointmentResponse;
import com.eclinician.appointment.AppointmentService;
import com.eclinician.appointment.AppointmentStatus;
import com.eclinician.patient.Patient;
import com.eclinician.patient.PatientRepository;
import com.eclinician.web.ConflictException;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class EncounterServiceTests {
    @Autowired EncounterService encounters;
    @Autowired AppointmentService appointments;
    @Autowired PatientRepository patients;

    @Test
    void draftCanBeFinalizedAndCompletesTheVisit() {
        Patient patient = patient("encounter-hospital");
        AppointmentResponse checkedIn = appointments.checkIn(patient.getTenantId(),
                new AppointmentRequest(patient.getId(), null, "Fever"));
        appointments.startSession(patient.getTenantId(), patient.getId());

        EncounterRequest request = request(patient, checkedIn, "Malaria", "Begin treatment");
        EncounterResponse draft = encounters.save(patient.getTenantId(), null, request);
        assertThat(draft.status()).isEqualTo(EncounterStatus.DRAFT);

        EncounterResponse finalized = encounters.finalizeEncounter(patient.getTenantId(), draft.id());
        assertThat(finalized.status()).isEqualTo(EncounterStatus.FINALIZED);
        assertThat(finalized.finalizedAt()).isNotNull();
        assertThat(appointments.list(patient.getTenantId(), patient.getId()))
                .singleElement().extracting(AppointmentResponse::status)
                .isEqualTo(AppointmentStatus.COMPLETED);
        assertThat(patients.findById(patient.getId()).orElseThrow().getActiveCareStatus()).isNull();
    }

    @Test
    void finalizationRequiresDiagnosisAndPlanAndFinalizedRecordsAreLocked() {
        Patient patient = patient("validation-hospital");
        AppointmentResponse checkedIn = appointments.checkIn(patient.getTenantId(),
                new AppointmentRequest(patient.getId(), null, "Review"));
        appointments.startSession(patient.getTenantId(), patient.getId());
        EncounterRequest incomplete = request(patient, checkedIn, null, null);
        EncounterResponse draft = encounters.save(patient.getTenantId(), null, incomplete);

        assertThatThrownBy(() -> encounters.finalizeEncounter(patient.getTenantId(), draft.id()))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("Diagnosis and treatment plan");

        EncounterResponse updated = encounters.save(patient.getTenantId(), draft.id(),
                request(patient, checkedIn, "Diagnosis", "Plan"));
        encounters.finalizeEncounter(patient.getTenantId(), updated.id());
        assertThatThrownBy(() -> encounters.save(patient.getTenantId(), updated.id(),
                request(patient, checkedIn, "Changed", "Changed")))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("cannot be changed");
    }

    private Patient patient(String tenantId) {
        Patient patient = new Patient();
        patient.setTenantId(tenantId);
        patient.setFirstName("Clinical");
        patient.setLastName("Patient");
        patient.setDateOfBirth(LocalDate.of(1985, 5, 5));
        patient.setSex("Female");
        patient.setPhone("+256700000002");
        return patients.save(patient);
    }

    private EncounterRequest request(Patient patient, AppointmentResponse appointment,
            String diagnosis, String plan) {
        return new EncounterRequest(patient.getId(), appointment.id(), "Dr Test", "Fever",
                "120/80", 37.2, 80, 65.0, "Fever and chills", "Alert", diagnosis, plan,
                "Medication once daily", "Full blood count");
    }
}
