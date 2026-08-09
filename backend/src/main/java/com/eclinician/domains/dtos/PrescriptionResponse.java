package com.eclinician.domains.dtos;

import com.eclinician.domains.enums.PrescriptionStatus;

import java.time.Instant;
import java.util.UUID;

public record PrescriptionResponse(
    UUID id,
    UUID patientId,
    String patientName,
    UUID encounterId,
    String medication,
    PrescriptionStatus status,
    String dispensedBy,
    Instant dispensedAt,
    String notes,
    Instant createdAt) {}
