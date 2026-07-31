package com.eclinician.appointment;

import java.time.Instant;
import java.util.UUID;

public record AppointmentResponse(
        UUID id,
        UUID patientId,
        String patientName,
        AppointmentStatus status,
        Instant scheduledAt,
        Instant checkedInAt,
        Instant sessionStartedAt,
        Instant completedAt,
        String reason,
        Instant createdAt,
        Instant updatedAt) {

    static AppointmentResponse from(Appointment appointment, String patientName) {
        return new AppointmentResponse(
                appointment.getId(),
                appointment.getPatientId(),
                patientName,
                appointment.getStatus(),
                appointment.getScheduledAt(),
                appointment.getCheckedInAt(),
                appointment.getSessionStartedAt(),
                appointment.getCompletedAt(),
                appointment.getReason(),
                appointment.getCreatedAt(),
                appointment.getUpdatedAt());
    }
}
