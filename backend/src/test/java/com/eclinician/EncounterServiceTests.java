package com.eclinician;

import com.eclinician.domains.dtos.AppointmentRequest;
import com.eclinician.domains.dtos.AppointmentResponse;
import com.eclinician.domains.dtos.EncounterRequest;
import com.eclinician.domains.dtos.EncounterResponse;
import com.eclinician.domains.entities.Patient;
import com.eclinician.domains.enums.AppointmentStatus;
import com.eclinician.domains.enums.EncounterStatus;
import com.eclinician.domains.enums.PatientCareStatus;
import com.eclinician.repositories.PatientRepository;
import com.eclinician.services.AppointmentService;
import com.eclinician.services.EncounterService;
import com.eclinician.web.ConflictException;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

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
        EncounterResponse draft = encounters.save(patient.getTenantId(), "Dr Test", null, request);
        assertThat(draft.status()).isEqualTo(EncounterStatus.DRAFT);

        EncounterResponse finalized = encounters.finalizeEncounter(patient.getTenantId(), draft.id());
        assertThat(finalized.status()).isEqualTo(EncounterStatus.FINALIZED);
        assertThat(finalized.finalizedAt()).isNotNull();
        assertThat(appointments.list(patient.getTenantId(), patient.getId()))
                .singleElement().extracting(AppointmentResponse::status)
                .isEqualTo(AppointmentStatus.COMPLETED);
        assertThat(patients.findById(patient.getId()).orElseThrow().getActiveCareStatus())
                .isEqualTo(PatientCareStatus.PHARMACY);
    }

    @Test
    void finalizationRequiresDiagnosisAndPlanAndFinalizedRecordsAreLocked() {
        Patient patient = patient("validation-hospital");
        AppointmentResponse checkedIn = appointments.checkIn(patient.getTenantId(),
                new AppointmentRequest(patient.getId(), null, "Review"));
        appointments.startSession(patient.getTenantId(), patient.getId());
        EncounterRequest incomplete = request(patient, checkedIn, null, null);
        EncounterResponse draft = encounters.save(patient.getTenantId(), "Dr Test", null, incomplete);

        assertThatThrownBy(() -> encounters.finalizeEncounter(patient.getTenantId(), draft.id()))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("Diagnosis and treatment plan");

        EncounterResponse updated = encounters.save(patient.getTenantId(), "Dr Test", draft.id(),
                request(patient, checkedIn, "Diagnosis", "Plan"));
        encounters.finalizeEncounter(patient.getTenantId(), updated.id());
        assertThatThrownBy(() -> encounters.save(patient.getTenantId(), "Dr Test", updated.id(),
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
        return new EncounterRequest(patient.getId(), appointment.id(), "Fever",
                120, 80, 37.2, 80, 65.0, 162.0, "Fever and chills", "Alert", diagnosis, plan,
                "Medication once daily", "Full blood count");
    }
}
