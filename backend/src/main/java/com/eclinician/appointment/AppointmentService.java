package com.eclinician.appointment;

import com.eclinician.patient.Patient;
import com.eclinician.patient.PatientRepository;
import com.eclinician.web.ConflictException;
import com.eclinician.web.NotFoundException;
import java.time.Instant;
import java.util.EnumSet;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AppointmentService {

    private static final EnumSet<AppointmentStatus> ACTIVE =
            EnumSet.of(AppointmentStatus.SCHEDULED, AppointmentStatus.CHECKED_IN,
                    AppointmentStatus.WAITING, AppointmentStatus.IN_SESSION);

    private final AppointmentRepository appointments;
    private final PatientRepository patients;

    AppointmentService(AppointmentRepository appointments, PatientRepository patients) {
        this.appointments = appointments;
        this.patients = patients;
    }

    List<AppointmentResponse> list(String tenantId, UUID patientId) {
        Sort newest = Sort.by(Sort.Direction.DESC, "createdAt");
        List<Appointment> result = patientId == null
                ? appointments.findByTenantId(tenantId, newest)
                : appointments.findByTenantIdAndPatientId(tenantId, patientId, newest);
        return result.stream().map(appointment -> response(tenantId, appointment)).toList();
    }

    @Transactional
    AppointmentResponse schedule(String tenantId, AppointmentRequest request) {
        Patient patient = patient(tenantId, request.patientId());
        ensureNoActiveAppointment(tenantId, patient.getId());

        Appointment appointment = new Appointment();
        appointment.setTenantId(tenantId);
        appointment.setPatientId(patient.getId());
        appointment.setStatus(AppointmentStatus.SCHEDULED);
        appointment.setScheduledAt(request.scheduledAt() == null
                ? Instant.now() : request.scheduledAt());
        appointment.setReason(request.reason());
        return response(patient, appointments.save(appointment));
    }

    @Transactional
    AppointmentResponse checkIn(String tenantId, AppointmentRequest request) {
        Patient patient = patient(tenantId, request.patientId());
        Appointment appointment = active(tenantId, patient.getId()).orElseGet(() -> {
            Appointment created = new Appointment();
            created.setTenantId(tenantId);
            created.setPatientId(patient.getId());
            created.setScheduledAt(request.scheduledAt() == null
                    ? Instant.now() : request.scheduledAt());
            created.setReason(request.reason());
            return created;
        });

        if (appointment.getStatus() == AppointmentStatus.IN_SESSION) {
            throw new ConflictException("Patient is already in session");
        }
        appointment.setStatus(AppointmentStatus.CHECKED_IN);
        if (appointment.getCheckedInAt() == null) appointment.setCheckedInAt(Instant.now());
        patient.setActiveCareStatus(PatientCareStatus.CHECKED_IN);
        patients.save(patient);
        return response(patient, appointments.save(appointment));
    }

    @Transactional
    AppointmentResponse markWaiting(String tenantId, UUID appointmentId) {
        Appointment appointment = appointment(tenantId, appointmentId);
        requireStatus(appointment, AppointmentStatus.CHECKED_IN);
        Patient patient = patient(tenantId, appointment.getPatientId());
        appointment.setStatus(AppointmentStatus.WAITING);
        patient.setActiveCareStatus(PatientCareStatus.WAITING);
        patients.save(patient);
        return response(patient, appointments.save(appointment));
    }

    @Transactional
    AppointmentResponse startSession(String tenantId, UUID patientId) {
        Patient patient = patient(tenantId, patientId);
        Appointment appointment = active(tenantId, patientId)
                .filter(value -> value.getStatus() == AppointmentStatus.CHECKED_IN
                        || value.getStatus() == AppointmentStatus.WAITING)
                .orElseThrow(() -> new ConflictException(
                        "Patient must be checked in before starting a session"));
        appointment.setStatus(AppointmentStatus.IN_SESSION);
        appointment.setSessionStartedAt(Instant.now());
        patient.setActiveCareStatus(PatientCareStatus.IN_SESSION);
        patients.save(patient);
        return response(patient, appointments.save(appointment));
    }

    @Transactional
    AppointmentResponse complete(String tenantId, UUID appointmentId) {
        Appointment appointment = appointment(tenantId, appointmentId);
        requireStatus(appointment, AppointmentStatus.IN_SESSION);
        Patient patient = patient(tenantId, appointment.getPatientId());
        appointment.setStatus(AppointmentStatus.COMPLETED);
        appointment.setCompletedAt(Instant.now());
        patient.setActiveCareStatus(null);
        patients.save(patient);
        return response(patient, appointments.save(appointment));
    }

    private void ensureNoActiveAppointment(String tenantId, UUID patientId) {
        if (active(tenantId, patientId).isPresent()) {
            throw new ConflictException("Patient already has an active appointment");
        }
    }

    private java.util.Optional<Appointment> active(String tenantId, UUID patientId) {
        return appointments.findFirstByTenantIdAndPatientIdAndStatusInOrderByCreatedAtDesc(
                tenantId, patientId, ACTIVE);
    }

    private Appointment appointment(String tenantId, UUID id) {
        return appointments.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new NotFoundException("Appointment not found"));
    }

    private Patient patient(String tenantId, UUID id) {
        return patients.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new NotFoundException("Patient not found"));
    }

    private void requireStatus(Appointment appointment, AppointmentStatus required) {
        if (appointment.getStatus() != required) {
            throw new ConflictException("Appointment must be " + required.name().toLowerCase());
        }
    }

    private AppointmentResponse response(String tenantId, Appointment appointment) {
        return response(patient(tenantId, appointment.getPatientId()), appointment);
    }

    private AppointmentResponse response(Patient patient, Appointment appointment) {
        return AppointmentResponse.from(
                appointment, patient.getFirstName() + " " + patient.getLastName());
    }
}
