package com.eclinician.domains.dtos;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.UUID;

public record AppointmentRequest(
        @NotNull UUID patientId,
        UUID doctorId,
        Instant scheduledAt,
        @Size(max = 500) String reason) {

    /** Walk-in shorthand: an arrival has no doctor chosen for it. */
    public AppointmentRequest(UUID patientId, Instant scheduledAt, String reason) {
        this(patientId, null, scheduledAt, reason);
    }
}
