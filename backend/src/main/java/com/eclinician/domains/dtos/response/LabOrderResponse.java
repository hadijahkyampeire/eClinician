package com.eclinician.domains.dtos.response;

import com.eclinician.domains.enums.LabStatus;

import java.time.Instant;
import java.util.UUID;

public record LabOrderResponse(
    UUID id,
    UUID patientId,
    String patientName,
    UUID encounterId,
    String testName,
    LabStatus status,
    String result,
    String resultedBy,
    Instant resultedAt,
    String notes,
    Instant createdAt) {}
