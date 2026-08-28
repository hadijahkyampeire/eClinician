package com.eclinician.domains.dtos.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.UUID;

public record AppointmentRequest(
        @NotNull UUID patientId,
        UUID doctorId,
        Instant scheduledAt,
        @Size(max = 500) String reason,
        /**
         * Only read at check-in: urgency is about the room today, not a future booking.
         * Boxed because most callers leave it out entirely, and absent means "waits its turn".
         */
        Boolean urgent) {}
