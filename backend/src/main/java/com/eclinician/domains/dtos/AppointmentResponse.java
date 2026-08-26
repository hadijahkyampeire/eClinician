package com.eclinician.domains.dtos;

import com.eclinician.domains.entities.Appointment;
import com.eclinician.domains.enums.AppointmentStatus;
import com.eclinician.domains.enums.PatientCareStatus;
import java.time.Instant;
import java.util.UUID;

public record AppointmentResponse(
        UUID id,
        UUID patientId,
        String patientName,
        UUID doctorId,
        String doctorName,
        String doctorSpecialty,
        String room,
        AppointmentStatus status,
        /** Where the patient physically is right now — the queue reads this, not the
         * appointment's lifecycle, to tell a patient at the bench from one in the room. */
        PatientCareStatus careStatus,
        boolean urgent,
        Instant scheduledAt,
        Instant checkedInAt,
        Instant waitingAt,
        Instant sessionStartedAt,
        Instant completedAt,
        String reason,
        Instant createdAt,
        Instant updatedAt) {

    public static AppointmentResponse from(Appointment appointment, String patientName,
            PatientCareStatus careStatus, String doctorName, String doctorSpecialty,
            String room) {
        return new AppointmentResponse(
                appointment.getId(),
                appointment.getPatientId(),
                patientName,
                appointment.getDoctorId(),
                doctorName,
                doctorSpecialty,
                room,
                appointment.getStatus(),
                careStatus,
                appointment.isUrgent(),
                appointment.getScheduledAt(),
                appointment.getCheckedInAt(),
                appointment.getWaitingAt(),
                appointment.getSessionStartedAt(),
                appointment.getCompletedAt(),
                appointment.getReason(),
                appointment.getCreatedAt(),
                appointment.getUpdatedAt());
    }
}
