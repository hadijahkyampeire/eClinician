package com.eclinician.services;

import com.eclinician.domains.dtos.EncounterRequest;
import com.eclinician.domains.dtos.EncounterResponse;
import com.eclinician.domains.entities.Appointment;
import com.eclinician.domains.entities.Encounter;
import com.eclinician.domains.entities.Patient;
import com.eclinician.domains.enums.AppointmentStatus;
import com.eclinician.domains.enums.EncounterStatus;
import com.eclinician.domains.enums.PatientCareStatus;
import com.eclinician.repositories.AppointmentRepository;
import com.eclinician.repositories.EncounterRepository;
import com.eclinician.repositories.PatientRepository;
import com.eclinician.web.ConflictException;
import com.eclinician.web.NotFoundException;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class EncounterService {
    private final EncounterRepository encounters;
    private final PatientRepository patients;
    private final AppointmentRepository appointments;
    private final PharmacyService pharmacyService;
    private final LabService labService;
    private final ClinicalSummaryService summaries;

    public EncounterService(EncounterRepository encounters, PatientRepository patients,
            AppointmentRepository appointments, PharmacyService pharmacyService,
            LabService labService, ClinicalSummaryService summaries) {
        this.encounters = encounters;
        this.patients = patients;
        this.appointments = appointments;
        this.pharmacyService = pharmacyService;
        this.labService = labService;
        this.summaries = summaries;
    }

    public List<EncounterResponse> list(String tenantId, UUID patientId) {
        return list(tenantId, patientId, null);
    }

    /** A clinician's unscoped records list is their own work; patient history remains complete. */
    public List<EncounterResponse> list(
            String tenantId, UUID patientId, String clinicianName) {
        List<Encounter> result = patientId == null
                ? clinicianName == null
                        ? encounters.findByTenantIdOrderByCreatedAtDesc(tenantId)
                        : encounters.findByTenantIdAndClinicianNameOrderByCreatedAtDesc(
                                tenantId, clinicianName)
                : encounters.findByTenantIdAndPatientIdOrderByCreatedAtDesc(tenantId, patientId);
        return result.stream().map(value -> response(tenantId, value)).toList();
    }

    public EncounterResponse get(String tenantId, UUID id) {
        return response(tenantId, encounter(tenantId, id));
    }

    @Transactional
    public EncounterResponse save(String tenantId, String clinicianName, UUID id,
            EncounterRequest request) {
        Encounter existing = id == null ? null : encounter(tenantId, id);
        Patient patient = patient(tenantId, request.patientId());
        Appointment appointment = appointment(tenantId, request.appointmentId());
        if (!appointment.getPatientId().equals(patient.getId())) {
            throw new ConflictException("Appointment does not belong to this patient");
        }
        // Signing off is not the same as the patient leaving. Between the two they are
        // still in the building — at the counter, or walking back from the bench — and a
        // clinician who spots a wrong dose in that window has to be able to fix it.
        boolean correcting = correctable(existing, patient);
        if (existing != null && !correcting) requireDraft(existing);
        if (!correcting && appointment.getStatus() != AppointmentStatus.IN_SESSION) {
            throw new ConflictException("Appointment must be in session to document an encounter");
        }

        Encounter value;
        if (id == null) {
            value = encounters.findByAppointmentIdAndTenantId(request.appointmentId(), tenantId)
                    .orElseGet(Encounter::new);
            if (value.getId() == null) {
                value.setTenantId(tenantId);
                value.setPatientId(patient.getId());
                value.setAppointmentId(appointment.getId());
                value.setStatus(EncounterStatus.DRAFT);
            }
        } else {
            value = existing;
            if (!value.getPatientId().equals(request.patientId())
                    || !value.getAppointmentId().equals(request.appointmentId())) {
                throw new ConflictException("Encounter patient and appointment cannot be changed");
            }
        }
        if (!correcting) requireDraft(value);
        copy(request, value);
        // The clinician is whoever is signed in, not whoever the form claims.
        value.setClinicianName(clinicianName);
        Encounter saved = encounters.save(value);
        if (correcting) {
            // Anything added to the note during a correction still has to reach the people
            // who act on it. Both of these only raise lines that are not already out.
            pharmacyService.createFromEncounter(tenantId, saved.getId(), saved.getPatientId(),
                    saved.getPrescriptions());
            labService.createFromEncounter(tenantId, saved.getId(), saved.getPatientId(),
                    saved.getLabRequests());
        }
        return response(patient, saved);
    }

    /**
     * A signed record is still open to correction until the patient is checked out, and
     * shut for good afterwards. Care status is the whole test: it is set the moment they
     * are sent on to the pharmacy and cleared when they leave, so it is exactly "are they
     * still here".
     */
    private boolean correctable(Encounter existing, Patient patient) {
        return existing != null
                && existing.getStatus() == EncounterStatus.FINALIZED
                && patient.getActiveCareStatus() != null;
    }

    @Transactional
    public EncounterResponse finalizeEncounter(String tenantId, UUID id) {
        Encounter value = encounter(tenantId, id);
        requireDraft(value);
        if (blank(value.getDiagnosis()) || blank(value.getTreatmentPlan())) {
            throw new ConflictException("Diagnosis and treatment plan are required to finalize");
        }
        Appointment appointment = appointment(tenantId, value.getAppointmentId());
        if (appointment.getStatus() != AppointmentStatus.IN_SESSION) {
            throw new ConflictException("Appointment must be in session to finalize the encounter");
        }
        Patient patient = patient(tenantId, value.getPatientId());
        value.setStatus(EncounterStatus.FINALIZED);
        value.setFinalizedAt(Instant.now());
        appointment.setStatus(AppointmentStatus.COMPLETED);
        appointment.setCompletedAt(Instant.now());
        patient.setActiveCareStatus(blank(value.getPrescriptions())
                ? null
                : PatientCareStatus.PHARMACY);
        appointments.save(appointment);
        patients.save(patient);
        pharmacyService.createFromEncounter(tenantId, value.getId(), value.getPatientId(), value.getPrescriptions());
        labService.createFromEncounter(tenantId, value.getId(), value.getPatientId(), value.getLabRequests());
        return response(patient, encounters.save(value));
    }

    /**
     * Sends the patient to the lab without ending the visit.
     *
     * Finalizing used to be the only way to raise an order, which meant a clinician who
     * wanted a result before deciding anything had to write a diagnosis they did not have
     * yet. Here the encounter stays a draft and the appointment stays in session — the
     * patient walks to the bench and comes back to the same open note.
     */
    @Transactional
    public EncounterResponse sendToLab(String tenantId, UUID id) {
        Encounter value = encounter(tenantId, id);
        requireDraft(value);
        if (blank(value.getLabRequests())) {
            throw new ConflictException("Add the tests you want run before sending to the lab");
        }
        Appointment appointment = appointment(tenantId, value.getAppointmentId());
        if (appointment.getStatus() != AppointmentStatus.IN_SESSION) {
            throw new ConflictException("The patient must be in session to be sent to the lab");
        }
        Patient patient = patient(tenantId, value.getPatientId());
        labService.createFromEncounter(tenantId, value.getId(), value.getPatientId(),
                value.getLabRequests());
        patient.setActiveCareStatus(PatientCareStatus.LAB);
        // A second trip starts a fresh wait: whatever came back last time is not the
        // result of the test just ordered.
        value.setSentToLabAt(Instant.now());
        value.setLabResultsReadyAt(null);
        patients.save(patient);
        return response(patient, encounters.save(value));
    }

    /**
     * Drafts the visit summary from the notes and saves it on the encounter. The clinician
     * edits it afterwards like any other field — the draft is a starting point, not the
     * record, which is why a finalized encounter refuses one.
     */
    @Transactional
    public EncounterResponse draftSummary(String tenantId, UUID id) {
        Encounter value = encounter(tenantId, id);
        requireDraft(value);
        value.setVisitSummary(summaries.draftFor(value));
        return response(tenantId, encounters.save(value));
    }

    private void copy(EncounterRequest source, Encounter target) {
        target.setChiefComplaint(source.chiefComplaint());
        target.setSystolicBp(source.systolicBp());
        target.setDiastolicBp(source.diastolicBp());
        target.setTemperatureCelsius(source.temperatureCelsius());
        target.setPulseBpm(source.pulseBpm());
        target.setWeightKg(source.weightKg());
        target.setHeightCm(source.heightCm());
        target.setSymptoms(source.symptoms());
        target.setExaminationNotes(source.examinationNotes());
        target.setDiagnosis(source.diagnosis());
        target.setTreatmentPlan(source.treatmentPlan());
        target.setPrescriptions(source.prescriptions());
        target.setLabRequests(source.labRequests());
        // Only overwritten when the clinician sends one, so drafting then saving other
        // fields never wipes the summary they kept.
        if (source.visitSummary() != null) target.setVisitSummary(source.visitSummary());
    }

    private void requireDraft(Encounter value) {
        if (value.getStatus() == EncounterStatus.FINALIZED) {
            throw new ConflictException(
                    "This visit is signed off and the patient has left — it cannot be changed");
        }
    }

    private Encounter encounter(String tenantId, UUID id) {
        return encounters.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new NotFoundException("Encounter not found"));
    }

    private Patient patient(String tenantId, UUID id) {
        return patients.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new NotFoundException("Patient not found"));
    }

    private Appointment appointment(String tenantId, UUID id) {
        return appointments.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new NotFoundException("Appointment not found"));
    }

    private EncounterResponse response(String tenantId, Encounter value) {
        return response(patient(tenantId, value.getPatientId()), value);
    }

    private EncounterResponse response(Patient patient, Encounter value) {
        return new EncounterResponse(value.getId(), value.getPatientId(),
                patient.getFirstName() + " " + patient.getLastName(), value.getAppointmentId(),
                value.getStatus(), value.getClinicianName(), value.getChiefComplaint(),
                value.getSystolicBp(), value.getDiastolicBp(), value.getTemperatureCelsius(),
                value.getPulseBpm(), value.getWeightKg(), value.getHeightCm(),
                value.getSymptoms(), value.getExaminationNotes(),
                value.getDiagnosis(), value.getTreatmentPlan(), value.getPrescriptions(),
                value.getLabRequests(), value.getVisitSummary(), value.getSentToLabAt(),
                value.getLabResultsReadyAt(), value.getFinalizedAt(),
                value.getCreatedAt(),
                value.getUpdatedAt());
    }

    private boolean blank(String value) {
        return value == null || value.isBlank();
    }
}
