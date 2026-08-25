package com.eclinician.domains.dtos;

import com.eclinician.domains.enums.PrescriptionStatus;
import java.time.Instant;
import java.util.UUID;

public record PrescriptionResponse(
        UUID id,
        UUID patientId,
        String patientName,
        UUID encounterId,
        /** What the clinician ordered. */
        String medication,
        PrescriptionStatus status,
        /** What the pharmacist handed over; null until dispensed. */
        String dispensedMedication,
        Integer quantityDispensed,
        String dispenseUnit,
        /** True when the two medicines differ — the record's headline fact. */
        boolean substituted,
        String dispensedBy,
        Instant dispensedAt,
        String notes,
        Instant createdAt) {}
