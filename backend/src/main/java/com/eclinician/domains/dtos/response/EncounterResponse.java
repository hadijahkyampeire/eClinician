package com.eclinician.domains.dtos.response;

import com.eclinician.domains.enums.EncounterStatus;
import java.time.Instant;
import java.util.UUID;

public record EncounterResponse(
        UUID id, UUID patientId, String patientName, UUID appointmentId,
        EncounterStatus status, String clinicianName, String chiefComplaint,
        Integer systolicBp, Integer diastolicBp, Double temperatureCelsius, Integer pulseBpm,
        Double weightKg, Double heightCm,
        String symptoms, String examinationNotes, String diagnosis, String treatmentPlan,
        String prescriptions, String labRequests, String visitSummary,
        Instant sentToLabAt, Instant labResultsReadyAt, Instant finalizedAt,
        Instant createdAt, Instant updatedAt) {}
