package com.eclinician;

import com.eclinician.domains.dtos.AppointmentRequest;
import com.eclinician.domains.dtos.AppointmentResponse;
import com.eclinician.domains.dtos.EncounterRequest;
import com.eclinician.domains.dtos.EncounterResponse;
import com.eclinician.domains.dtos.BenchPatient;
import com.eclinician.domains.dtos.LabOrderResponse;
import com.eclinician.domains.dtos.LabResultRequest;
import com.eclinician.domains.dtos.PrescriptionResponse;
import com.eclinician.domains.entities.Patient;
import com.eclinician.domains.enums.AppointmentStatus;
import com.eclinician.domains.enums.EncounterStatus;
import com.eclinician.domains.enums.LabStatus;
import com.eclinician.domains.enums.PatientCareStatus;
import com.eclinician.repositories.PatientRepository;
import com.eclinician.services.AppointmentService;
import com.eclinician.services.EncounterService;
import com.eclinician.services.LabService;
import com.eclinician.services.PharmacyService;
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
    @Autowired LabService labs;
    @Autowired PharmacyService pharmacy;

    @Test
    void draftCanBeFinalizedAndCompletesTheVisit() {
        Patient patient = patient("encounter-hospital");
        AppointmentResponse checkedIn = appointments.checkIn(patient.getTenantId(),
                new AppointmentRequest(patient.getId(), null, null, "Fever", false));
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

    /** Locked means locked once the patient has gone; until then see the correction test. */
    @Test
    void finalizationRequiresDiagnosisAndPlanAndAClosedVisitIsLocked() {
        Patient patient = patient("validation-hospital");
        AppointmentResponse checkedIn = appointments.checkIn(patient.getTenantId(),
                new AppointmentRequest(patient.getId(), null, null, "Review", false));
        appointments.startSession(patient.getTenantId(), patient.getId());
        EncounterRequest incomplete = request(patient, checkedIn, null, null);
        EncounterResponse draft = encounters.save(patient.getTenantId(), "Dr Test", null, incomplete);

        assertThatThrownBy(() -> encounters.finalizeEncounter(patient.getTenantId(), draft.id()))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("Diagnosis and treatment plan");

        EncounterResponse updated = encounters.save(patient.getTenantId(), "Dr Test", draft.id(),
                request(patient, checkedIn, "Diagnosis", "Plan"));
        encounters.finalizeEncounter(patient.getTenantId(), updated.id());
        pharmacy.checkOut(patient.getTenantId(), patient.getId());

        assertThatThrownBy(() -> encounters.save(patient.getTenantId(), "Dr Test", updated.id(),
                request(patient, checkedIn, "Changed", "Changed")))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("the patient has left");
    }

    @Test
    void aTripToTheLabPausesTheVisitAndSendsThePatientBackWithResults() {
        Patient patient = patient("lab-round-trip-hospital");
        String tenantId = patient.getTenantId();
        AppointmentResponse checkedIn = appointments.checkIn(tenantId,
                new AppointmentRequest(patient.getId(), null, null, "Fever", false));
        appointments.startSession(tenantId, patient.getId());
        EncounterResponse draft = encounters.save(tenantId, "Dr Test", null,
                request(patient, checkedIn, null, null));

        EncounterResponse sent = encounters.sendToLab(tenantId, draft.id());
        // The visit is paused, not finished: no diagnosis was needed to raise the order.
        assertThat(sent.status()).isEqualTo(EncounterStatus.DRAFT);
        assertThat(sent.sentToLabAt()).isNotNull();
        assertThat(sent.labResultsReadyAt()).isNull();
        assertThat(appointments.list(tenantId, patient.getId()))
                .singleElement().extracting(AppointmentResponse::status)
                .isEqualTo(AppointmentStatus.IN_SESSION);
        assertThat(patients.findById(patient.getId()).orElseThrow().getActiveCareStatus())
                .isEqualTo(PatientCareStatus.LAB);

        LabOrderResponse order = labs.listForPatient(tenantId, patient.getId()).getFirst();
        assertThat(order.testName()).isEqualTo("Full blood count");
        labs.update(tenantId, "Tech", order.id(),
                new LabResultRequest(LabStatus.COMPLETED, "Haemoglobin 11.2 g/dl", null));

        // Resulted, so they rejoin the queue on a new clock rather than walking back in
        // over everyone who has not been seen at all. The open note says why they are back.
        assertThat(patients.findById(patient.getId()).orElseThrow().getActiveCareStatus())
                .isEqualTo(PatientCareStatus.WAITING);
        AppointmentResponse requeued = appointments.list(tenantId, patient.getId()).getFirst();
        assertThat(requeued.status()).isEqualTo(AppointmentStatus.WAITING);
        assertThat(requeued.waitingAt()).isAfter(sent.sentToLabAt());
        assertThat(encounters.get(tenantId, draft.id()).labResultsReadyAt()).isNotNull();

        // Their turn comes round again, and it is the same note they come back to.
        appointments.startSession(tenantId, patient.getId());
        encounters.save(tenantId, "Dr Test", draft.id(),
                request(patient, checkedIn, "Anaemia", "Iron supplements"));
        encounters.finalizeEncounter(tenantId, draft.id());
        // Finalizing after the trip does not raise the same test a second time.
        assertThat(labs.listForPatient(tenantId, patient.getId())).hasSize(1);
    }

    @Test
    void takingTheSampleSendsThePatientBackBeforeTheResultIsWritten() {
        Patient patient = patient("slow-test-hospital");
        String tenantId = patient.getTenantId();
        AppointmentResponse checkedIn = appointments.checkIn(tenantId,
                new AppointmentRequest(patient.getId(), null, null, "Fever", false));
        appointments.startSession(tenantId, patient.getId());
        EncounterResponse draft = encounters.save(tenantId, "Dr Test", null,
                request(patient, checkedIn, null, null));
        encounters.sendToLab(tenantId, draft.id());

        // The specimen is taken, but a culture is not read for two days and nobody stands
        // at a bench for two days.
        LabOrderResponse order = labs.listForPatient(tenantId, patient.getId()).getFirst();
        labs.update(tenantId, "Tech", order.id(),
                new LabResultRequest(LabStatus.IN_PROGRESS, "Plated, reading Thursday", null));

        assertThat(patients.findById(patient.getId()).orElseThrow().getActiveCareStatus())
                .isEqualTo(PatientCareStatus.WAITING);
        assertThat(appointments.list(tenantId, patient.getId()).getFirst().status())
                .isEqualTo(AppointmentStatus.WAITING);
        // Back in the queue, but the clinician is not told an answer exists yet.
        assertThat(encounters.get(tenantId, draft.id()).labResultsReadyAt()).isNull();

        labs.update(tenantId, "Tech", order.id(),
                new LabResultRequest(LabStatus.COMPLETED, "No growth after 48 hours", null));
        assertThat(encounters.get(tenantId, draft.id()).labResultsReadyAt()).isNotNull();
    }

    /**
     * Two saves that both think they are the first must land on one note. The unique index
     * on appointment_id says one visit has one note; reaching it as a raw database error
     * tells a clinician nothing they can act on.
     */
    @Test
    void aSecondSaveForTheSameVisitLandsOnTheSameNote() {
        Patient patient = patient("one-note-hospital");
        String tenantId = patient.getTenantId();
        AppointmentResponse checkedIn = appointments.checkIn(tenantId,
                new AppointmentRequest(patient.getId(), null, null, "Fever", false));
        appointments.startSession(tenantId, patient.getId());

        EncounterResponse first = encounters.save(tenantId, "Dr Test", null,
                request(patient, checkedIn, null, null));
        EncounterResponse second = encounters.save(tenantId, "Dr Test", null,
                request(patient, checkedIn, null, null));

        assertThat(second.id()).isEqualTo(first.id());
        assertThat(encounters.list(tenantId, patient.getId())).hasSize(1);
    }

    /**
     * A visit that is signed off is a record, and its appointment is closed with it. The
     * refusal says which, in words — never as a raw constraint the clinician cannot read.
     */
    @Test
    void aNoteForAVisitAlreadySignedOffIsRefusedReadably() {
        Patient patient = patient("signed-off-hospital");
        String tenantId = patient.getTenantId();
        AppointmentResponse checkedIn = appointments.checkIn(tenantId,
                new AppointmentRequest(patient.getId(), null, null, "Fever", false));
        appointments.startSession(tenantId, patient.getId());
        EncounterResponse draft = encounters.save(tenantId, "Dr Test", null,
                request(patient, checkedIn, "Malaria", "Treat"));
        encounters.finalizeEncounter(tenantId, draft.id());

        assertThatThrownBy(() -> encounters.save(tenantId, "Dr Test", null,
                request(patient, checkedIn, "Malaria", "Treat")))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("must be in session");
    }

    /**
     * Signing off is not the same as the patient leaving. While they are still at the
     * counter a wrong dose can be put right — and a medicine added in that window has to
     * reach the counter, not just the note.
     */
    @Test
    void aSignedNoteCanBeCorrectedWhileThePatientIsStillInTheBuilding() {
        Patient patient = patient("correction-hospital");
        String tenantId = patient.getTenantId();
        AppointmentResponse checkedIn = appointments.checkIn(tenantId,
                new AppointmentRequest(patient.getId(), null, null, "Fever", false));
        appointments.startSession(tenantId, patient.getId());
        EncounterResponse draft = encounters.save(tenantId, "Dr Test", null,
                request(patient, checkedIn, "Malaria", "Treat"));
        encounters.finalizeEncounter(tenantId, draft.id());

        // Sent on to the counter, so they have not left.
        assertThat(patients.findById(patient.getId()).orElseThrow().getActiveCareStatus())
                .isEqualTo(PatientCareStatus.PHARMACY);
        EncounterRequest corrected = new EncounterRequest(patient.getId(), checkedIn.id(),
                "Fever", 120, 80, 37.2, 80, 65.0, 162.0, "Fever and chills", "Alert",
                "Malaria", "Treat", "Medication once daily\nParacetamol 500mg",
                "Full blood count", null);
        EncounterResponse fixed = encounters.save(tenantId, "Dr Test", draft.id(), corrected);

        assertThat(fixed.status()).isEqualTo(EncounterStatus.FINALIZED);
        assertThat(fixed.prescriptions()).contains("Paracetamol 500mg");
        // The added medicine reached the counter rather than only the note.
        assertThat(pharmacy.listForPatient(tenantId, patient.getId()))
                .extracting(PrescriptionResponse::medication)
                .contains("Medication once daily", "Paracetamol 500mg");

        // They collect and go, and the record shuts for good.
        pharmacy.checkOut(tenantId, patient.getId());
        assertThatThrownBy(() -> encounters.save(tenantId, "Dr Test", draft.id(), corrected))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("the patient has left");
    }

    /**
     * The bench works through people. Two patients needing the same test used to be two
     * rows that read identically, and whoever has waited longest is next.
     */
    @Test
    void theBenchQueueIsPatientsInTheOrderTheyArrived() {
        Patient first = sentToLab("bench-hospital", "Ann", "Full blood count\nUrinalysis");
        Patient second = sentToLab("bench-hospital", "Ben", "Full blood count");

        assertThat(labs.bench("bench-hospital")).satisfiesExactly(
                ann -> {
                    assertThat(ann.patientId()).isEqualTo(first.getId());
                    assertThat(ann.tests()).extracting(LabOrderResponse::testName)
                            .containsExactly("Full blood count", "Urinalysis");
                    assertThat(ann.waitingSince()).isNotNull();
                },
                ben -> {
                    assertThat(ben.patientId()).isEqualTo(second.getId());
                    assertThat(ben.tests()).hasSize(1);
                });

        // Answered tests leave the bench; the patient goes with the last of them.
        for (LabOrderResponse test : labs.listForPatient("bench-hospital", second.getId())) {
            labs.update("bench-hospital", "Tech", test.id(),
                    new LabResultRequest(LabStatus.COMPLETED, "Normal", null));
        }
        assertThat(labs.bench("bench-hospital")).singleElement()
                .extracting(BenchPatient::patientId).isEqualTo(first.getId());
    }

    /** A patient checked in, seen, and sent to the bench with the tests named. */
    private Patient sentToLab(String tenantId, String name, String tests) {
        Patient patient = new Patient();
        patient.setTenantId(tenantId);
        patient.setFirstName(name);
        patient.setLastName("Bench");
        patient.setDateOfBirth(LocalDate.of(1990, 1, 1));
        Patient saved = patients.save(patient);
        AppointmentResponse checkedIn = appointments.checkIn(tenantId,
                new AppointmentRequest(saved.getId(), null, null, "Fever", false));
        appointments.startSession(tenantId, saved.getId());
        EncounterResponse draft = encounters.save(tenantId, "Dr Test",
                null, new EncounterRequest(saved.getId(), checkedIn.id(), "Fever",
                        120, 80, 37.2, 80, 65.0, 162.0, null, null, null, null, null, tests));
        encounters.sendToLab(tenantId, draft.id());
        return saved;
    }

    @Test
    void theDeskCanPutAnUrgentPatientAheadOfTheQueue() {
        Patient patient = patient("urgent-hospital");
        String tenantId = patient.getTenantId();
        AppointmentResponse routine = appointments.checkIn(tenantId,
                new AppointmentRequest(patient.getId(), null, null, "Cough", false));
        assertThat(routine.urgent()).isFalse();

        // The desk sees the baby has gone quiet after they have already sat down.
        assertThat(appointments.setUrgent(tenantId, routine.id(), true).urgent()).isTrue();
        assertThat(appointments.setUrgent(tenantId, routine.id(), false).urgent()).isFalse();
    }

    @Test
    void theLabWillNotTakeAPatientWithNoTestsOrdered() {
        Patient patient = patient("empty-lab-request-hospital");
        String tenantId = patient.getTenantId();
        AppointmentResponse checkedIn = appointments.checkIn(tenantId,
                new AppointmentRequest(patient.getId(), null, null, "Review", false));
        appointments.startSession(tenantId, patient.getId());
        EncounterRequest noTests = new EncounterRequest(patient.getId(), checkedIn.id(), "Review",
                120, 80, 37.0, 72, 65.0, 162.0, null, null, null, null, null, null);
        EncounterResponse draft = encounters.save(tenantId, "Dr Test", null, noTests);

        assertThatThrownBy(() -> encounters.sendToLab(tenantId, draft.id()))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("Add the tests");
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
