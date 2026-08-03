package com.eclinician.encounter;

import java.time.Instant;
import java.util.UUID;

public record EncounterResponse(
        UUID id, UUID patientId, String patientName, UUID appointmentId,
        EncounterStatus status, String clinicianName, String chiefComplaint,
        String bloodPressure, Double temperatureCelsius, Integer pulseBpm, Double weightKg,
        String symptoms, String examinationNotes, String diagnosis, String treatmentPlan,
        String prescriptions, String labRequests, Instant finalizedAt,
        Instant createdAt, Instant updatedAt) {}
