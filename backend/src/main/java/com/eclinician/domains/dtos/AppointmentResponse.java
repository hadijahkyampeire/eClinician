package com.eclinician.domains.dtos;

import com.eclinician.domains.entities.Appointment;
import com.eclinician.domains.enums.AppointmentStatus;
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

    public static AppointmentResponse from(Appointment appointment, String patientName) {
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
