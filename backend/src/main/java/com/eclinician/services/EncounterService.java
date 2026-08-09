package com.eclinician.services;

import com.eclinician.domains.dtos.EncounterRequest;
import com.eclinician.domains.dtos.EncounterResponse;
import com.eclinician.domains.entities.Appointment;
import com.eclinician.domains.entities.Encounter;
import com.eclinician.domains.entities.Patient;
import com.eclinician.domains.enums.AppointmentStatus;
import com.eclinician.domains.enums.EncounterStatus;
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

    public EncounterService(EncounterRepository encounters, PatientRepository patients,
            AppointmentRepository appointments, PharmacyService pharmacyService) {
        this.encounters = encounters;
        this.patients = patients;
        this.appointments = appointments;
        this.pharmacyService = pharmacyService;
    }

    public List<EncounterResponse> list(String tenantId, UUID patientId) {
        List<Encounter> result = patientId == null
                ? encounters.findByTenantIdOrderByCreatedAtDesc(tenantId)
                : encounters.findByTenantIdAndPatientIdOrderByCreatedAtDesc(tenantId, patientId);
        return result.stream().map(value -> response(tenantId, value)).toList();
    }

    public EncounterResponse get(String tenantId, UUID id) {
        return response(tenantId, encounter(tenantId, id));
    }

    @Transactional
    public EncounterResponse save(String tenantId, UUID id, EncounterRequest request) {
        Encounter existing = id == null ? null : encounter(tenantId, id);
        if (existing != null) requireDraft(existing);
        Patient patient = patient(tenantId, request.patientId());
        Appointment appointment = appointment(tenantId, request.appointmentId());
        if (!appointment.getPatientId().equals(patient.getId())) {
            throw new ConflictException("Appointment does not belong to this patient");
        }
        if (appointment.getStatus() != AppointmentStatus.IN_SESSION) {
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
        requireDraft(value);
        copy(request, value);
        return response(patient, encounters.save(value));
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
        patient.setActiveCareStatus(null);
        appointments.save(appointment);
        patients.save(patient);
        pharmacyService.createFromEncounter(tenantId, value.getId(), value.getPatientId(), value.getPrescriptions());
        return response(patient, encounters.save(value));
    }

    private void copy(EncounterRequest source, Encounter target) {
        target.setClinicianName(source.clinicianName().trim());
        target.setChiefComplaint(source.chiefComplaint());
        target.setBloodPressure(source.bloodPressure());
        target.setTemperatureCelsius(source.temperatureCelsius());
        target.setPulseBpm(source.pulseBpm());
        target.setWeightKg(source.weightKg());
        target.setSymptoms(source.symptoms());
        target.setExaminationNotes(source.examinationNotes());
        target.setDiagnosis(source.diagnosis());
        target.setTreatmentPlan(source.treatmentPlan());
        target.setPrescriptions(source.prescriptions());
        target.setLabRequests(source.labRequests());
    }

    private void requireDraft(Encounter value) {
        if (value.getStatus() == EncounterStatus.FINALIZED) {
            throw new ConflictException("Finalized encounters cannot be changed");
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
                value.getBloodPressure(), value.getTemperatureCelsius(), value.getPulseBpm(),
                value.getWeightKg(), value.getSymptoms(), value.getExaminationNotes(),
                value.getDiagnosis(), value.getTreatmentPlan(), value.getPrescriptions(),
                value.getLabRequests(), value.getFinalizedAt(), value.getCreatedAt(),
                value.getUpdatedAt());
    }

    private boolean blank(String value) {
        return value == null || value.isBlank();
    }
}
