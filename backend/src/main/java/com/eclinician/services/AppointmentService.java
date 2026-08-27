package com.eclinician.services;

import com.eclinician.domains.dtos.request.AppointmentRequest;
import com.eclinician.domains.dtos.response.AppointmentResponse;
import com.eclinician.domains.entities.AppUser;
import com.eclinician.domains.entities.Appointment;
import com.eclinician.domains.entities.Patient;
import com.eclinician.domains.enums.AppointmentStatus;
import com.eclinician.domains.enums.PatientCareStatus;
import com.eclinician.domains.enums.UserRole;
import com.eclinician.exceptions.ConflictException;
import com.eclinician.exceptions.NotFoundException;
import com.eclinician.repositories.AppointmentRepository;
import com.eclinician.repositories.ClinicianAvailabilityRepository;
import com.eclinician.repositories.PatientRepository;
import com.eclinician.repositories.UserRepository;
import java.time.Instant;
import java.time.ZonedDateTime;
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
    private final UserRepository users;
    private final ClinicianAvailabilityRepository availability;
    private final ClinicClock clock;
    private final CheckInExpiry expiry;

    public AppointmentService(AppointmentRepository appointments, PatientRepository patients,
            UserRepository users, ClinicianAvailabilityRepository availability,
            ClinicClock clock, CheckInExpiry expiry) {
        this.appointments = appointments;
        this.patients = patients;
        this.users = users;
        this.availability = availability;
        this.clock = clock;
        this.expiry = expiry;
    }

    @Transactional
    public List<AppointmentResponse> list(String tenantId, UUID patientId) {
        return list(tenantId, patientId, null);
    }

    /** Clinicians' general queue contains arrivals only; a patient-specific history stays whole. */
    @Transactional
    public List<AppointmentResponse> list(
            String tenantId, UUID patientId, String clinicianEmail) {
        expiry.sweep(tenantId);
        UUID clinicianId = clinicianEmail == null ? null
                : clinician(tenantId, clinicianEmail).getId();
        Sort newest = Sort.by(Sort.Direction.DESC, "createdAt");
        List<Appointment> result = patientId == null
                ? appointments.findByTenantId(tenantId, newest)
                : appointments.findByTenantIdAndPatientId(tenantId, patientId, newest);
        return result.stream()
                .filter(appointment -> clinicianId == null || patientId != null
                        || ((appointment.getStatus() == AppointmentStatus.CHECKED_IN
                                || appointment.getStatus() == AppointmentStatus.WAITING
                                || appointment.getStatus() == AppointmentStatus.IN_SESSION)
                            && (appointment.getDoctorId() == null
                                || appointment.getDoctorId().equals(clinicianId))))
                .map(appointment -> response(tenantId, appointment)).toList();
    }

    @Transactional
    public AppointmentResponse schedule(String tenantId, AppointmentRequest request) {
        Patient patient = patient(tenantId, request.patientId());
        ensureNoActiveAppointment(tenantId, patient.getId());
        AppUser doctor = doctor(tenantId, request.doctorId());
        Instant when = request.scheduledAt() == null ? Instant.now() : request.scheduledAt();
        ensureSlotIsFree(tenantId, doctor, when, patient.getId(), null);

        Appointment appointment = new Appointment();
        appointment.setTenantId(tenantId);
        appointment.setPatientId(patient.getId());
        appointment.setDoctorId(doctor == null ? null : doctor.getId());
        appointment.setStatus(AppointmentStatus.SCHEDULED);
        appointment.setScheduledAt(when);
        appointment.setReason(request.reason());
        return response(patient, appointments.save(appointment));
    }

    /** SRS 2.1.2: the details change and the conflict rules are re-checked. */
    @Transactional
    public AppointmentResponse update(String tenantId, UUID id, AppointmentRequest request) {
        Appointment appointment = appointment(tenantId, id);
        requireOpen(appointment);
        Patient patient = patient(tenantId, request.patientId());
        AppUser doctor = doctor(tenantId, request.doctorId());
        Instant when = request.scheduledAt() == null
                ? appointment.getScheduledAt() : request.scheduledAt();
        ensureSlotIsFree(tenantId, doctor, when, patient.getId(), appointment.getId());

        appointment.setPatientId(patient.getId());
        appointment.setDoctorId(doctor == null ? null : doctor.getId());
        appointment.setScheduledAt(when);
        appointment.setReason(request.reason());
        return response(patient, appointments.save(appointment));
    }

    /** SRS 2.1.3: an appointment that has already taken place cannot be cancelled. */
    @Transactional
    public AppointmentResponse cancel(String tenantId, UUID id) {
        Appointment appointment = appointment(tenantId, id);
        if (appointment.getStatus() == AppointmentStatus.IN_SESSION
                || appointment.getStatus() == AppointmentStatus.COMPLETED) {
            throw new ConflictException(
                    "An appointment that has already taken place cannot be cancelled");
        }
        if (appointment.getStatus() == AppointmentStatus.CANCELLED) {
            throw new ConflictException("This appointment is already cancelled");
        }
        Patient patient = patient(tenantId, appointment.getPatientId());
        appointment.setStatus(AppointmentStatus.CANCELLED);
        patient.setActiveCareStatus(null);
        patients.save(patient);
        return response(patient, appointments.save(appointment));
    }

    @Transactional
    public AppointmentResponse checkIn(String tenantId, AppointmentRequest request) {
        Patient patient = patient(tenantId, request.patientId());
        AppUser requestedDoctor = doctor(tenantId, request.doctorId());
        Appointment appointment = active(tenantId, patient.getId()).orElseGet(() -> {
            Appointment created = new Appointment();
            created.setTenantId(tenantId);
            created.setPatientId(patient.getId());
            created.setDoctorId(requestedDoctor == null ? null : requestedDoctor.getId());
            created.setScheduledAt(request.scheduledAt() == null
                    ? Instant.now() : request.scheduledAt());
            created.setReason(request.reason());
            return created;
        });

        if (appointment.getStatus() == AppointmentStatus.IN_SESSION) {
            throw new ConflictException("Patient is already in session");
        }
        if (requestedDoctor != null) appointment.setDoctorId(requestedDoctor.getId());
        if (Boolean.TRUE.equals(request.urgent())) appointment.setUrgent(true);
        appointment.setStatus(AppointmentStatus.CHECKED_IN);
        if (appointment.getCheckedInAt() == null) appointment.setCheckedInAt(Instant.now());
        patient.setActiveCareStatus(PatientCareStatus.CHECKED_IN);
        patients.save(patient);
        return response(patient, appointments.save(appointment));
    }

    /**
     * The desk's override on the queue's order. Not a triage score: someone at the front
     * desk looking at a baby who has gone quiet needs one box, not a five-point scale.
     */
    @Transactional
    public AppointmentResponse setUrgent(String tenantId, UUID appointmentId, boolean urgent) {
        Appointment appointment = appointment(tenantId, appointmentId);
        appointment.setUrgent(urgent);
        return response(tenantId, appointments.save(appointment));
    }

    @Transactional
    public AppointmentResponse markWaiting(String tenantId, UUID appointmentId) {
        Appointment appointment = appointment(tenantId, appointmentId);
        requireStatus(appointment, AppointmentStatus.CHECKED_IN);
        Patient patient = patient(tenantId, appointment.getPatientId());
        appointment.setStatus(AppointmentStatus.WAITING);
        appointment.setWaitingAt(Instant.now());
        patient.setActiveCareStatus(PatientCareStatus.WAITING);
        patients.save(patient);
        return response(patient, appointments.save(appointment));
    }

    @Transactional
    public AppointmentResponse startSession(String tenantId, UUID patientId) {
        return startSession(tenantId, patientId, null);
    }

    @Transactional
    public AppointmentResponse startSession(
            String tenantId, UUID patientId, String clinicianEmail) {
        Patient patient = patient(tenantId, patientId);
        AppUser clinician = clinicianEmail == null ? null : clinician(tenantId, clinicianEmail);
        Appointment appointment = active(tenantId, patientId)
                .filter(value -> value.getStatus() == AppointmentStatus.CHECKED_IN
                        || value.getStatus() == AppointmentStatus.WAITING)
                .filter(value -> clinician == null || value.getDoctorId() == null
                        || value.getDoctorId().equals(clinician.getId()))
                .orElseThrow(() -> new ConflictException(
                        "Patient must be checked in and assigned to you before starting a session"));
        if (appointment.getDoctorId() == null && clinician != null) {
            appointment.setDoctorId(clinician.getId());
        }
        appointment.setStatus(AppointmentStatus.IN_SESSION);
        appointment.setSessionStartedAt(Instant.now());
        patient.setActiveCareStatus(PatientCareStatus.IN_SESSION);
        patients.save(patient);
        return response(patient, appointments.save(appointment));
    }

    @Transactional
    public AppointmentResponse complete(String tenantId, UUID appointmentId) {
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

    /**
     * SRS: a doctor cannot hold two appointments at one date and time, and a patient
     * cannot hold two with the same doctor at that time. A walk-in carries no doctor,
     * so it can never clash.
     */
    private void ensureSlotIsFree(String tenantId, AppUser doctor, Instant when,
            UUID patientId, UUID selfId) {
        if (doctor == null) return;
        appointments.findByTenantIdAndDoctorIdAndScheduledAtAndStatusIn(
                        tenantId, doctor.getId(), when, ACTIVE).stream()
                .filter(other -> !other.getId().equals(selfId))
                .findFirst()
                .ifPresent(other -> {
                    throw new ConflictException(other.getPatientId().equals(patientId)
                            ? "This patient already has an appointment with this doctor at that time"
                            : "That doctor already has an appointment at that time");
                });
    }

    private AppUser doctor(String tenantId, UUID doctorId) {
        if (doctorId == null) return null;
        AppUser doctor = users.findByIdAndTenantId(doctorId, tenantId)
                .orElseThrow(() -> new NotFoundException("Doctor not found"));
        if (doctor.getRole() != UserRole.CLINICIAN || !doctor.isActive()) {
            throw new ConflictException("Appointments can only be booked with an active clinician");
        }
        return doctor;
    }

    private AppUser clinician(String tenantId, String email) {
        AppUser clinician = users.findByEmailIgnoreCase(email)
                .filter(user -> tenantId.equals(user.getTenantId()))
                .orElseThrow(() -> new NotFoundException("Clinician not found"));
        if (clinician.getRole() != UserRole.CLINICIAN || !clinician.isActive()) {
            throw new ConflictException("An active clinician is required");
        }
        return clinician;
    }

    private void requireOpen(Appointment appointment) {
        if (appointment.getStatus() == AppointmentStatus.COMPLETED
                || appointment.getStatus() == AppointmentStatus.CANCELLED) {
            throw new ConflictException("A closed appointment can no longer be changed");
        }
    }

    /** Yesterday's check-in is not active care, so it is settled before we look. */
    private java.util.Optional<Appointment> active(String tenantId, UUID patientId) {
        expiry.sweep(tenantId);
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
        AppUser doctor = appointment.getDoctorId() == null ? null
                : users.findByIdAndTenantId(appointment.getDoctorId(), appointment.getTenantId())
                        .orElse(null);
        return AppointmentResponse.from(appointment,
                patient.getFirstName() + " " + patient.getLastName(),
                patient.getActiveCareStatus(),
                doctor == null ? null : doctor.getName(),
                doctor == null ? null : doctor.getSpecialty(),
                room(appointment));
    }

    /**
     * The room the patient is waiting for: the one the clinician holds on the shift covering
     * this appointment, read in the clinic's own hours rather than the server's.
     */
    private String room(Appointment appointment) {
        if (appointment.getDoctorId() == null) {
            return null;
        }
        ZonedDateTime local = appointment.getScheduledAt()
                .atZone(clock.zoneOf(appointment.getTenantId()));
        return availability.findShiftAt(appointment.getTenantId(), appointment.getDoctorId(),
                        local.getDayOfWeek(), local.toLocalTime())
                .stream().findFirst().map(shift -> shift.getRoom()).orElse(null);
    }
}
