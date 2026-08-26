package com.eclinician.domains.dtos;

import com.eclinician.domains.entities.Appointment;
import com.eclinician.domains.enums.AppointmentStatus;
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
        Instant scheduledAt,
        Instant checkedInAt,
        Instant waitingAt,
        Instant sessionStartedAt,
        Instant completedAt,
        String reason,
        Instant createdAt,
        Instant updatedAt) {

    public static AppointmentResponse from(Appointment appointment, String patientName,
            String doctorName, String doctorSpecialty, String room) {
        return new AppointmentResponse(
                appointment.getId(),
                appointment.getPatientId(),
                patientName,
                appointment.getDoctorId(),
                doctorName,
                doctorSpecialty,
                room,
                appointment.getStatus(),
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
