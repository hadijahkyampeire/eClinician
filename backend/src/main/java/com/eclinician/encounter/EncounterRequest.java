package com.eclinician.encounter;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import java.util.UUID;

public record EncounterRequest(
        @NotNull UUID patientId,
        @NotNull UUID appointmentId,
        @NotBlank @Size(max = 150) String clinicianName,
        @Size(max = 500) String chiefComplaint,
        @Size(max = 30) String bloodPressure,
        @PositiveOrZero Double temperatureCelsius,
        @Positive Integer pulseBpm,
        @Positive Double weightKg,
        String symptoms,
        String examinationNotes,
        String diagnosis,
        String treatmentPlan,
        String prescriptions,
        String labRequests) {}
