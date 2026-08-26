package com.eclinician.domains.dtos;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import java.util.UUID;

public record EncounterRequest(
        @NotNull UUID patientId,
        @NotNull UUID appointmentId,
        @Size(max = 500) String chiefComplaint,
        @Positive Integer systolicBp,
        @Positive Integer diastolicBp,
        @PositiveOrZero Double temperatureCelsius,
        @Positive Integer pulseBpm,
        @Positive Double weightKg,
        @Positive Double heightCm,
        String symptoms,
        String examinationNotes,
        String diagnosis,
        String treatmentPlan,
        String prescriptions,
        String labRequests,
        String visitSummary) {

    /** Existing call sites that predate the drafted summary. */
    public EncounterRequest(UUID patientId, UUID appointmentId, String chiefComplaint,
            Integer systolicBp, Integer diastolicBp, Double temperatureCelsius, Integer pulseBpm,
            Double weightKg, Double heightCm, String symptoms, String examinationNotes,
            String diagnosis, String treatmentPlan, String prescriptions, String labRequests) {
        this(patientId, appointmentId, chiefComplaint, systolicBp, diastolicBp,
                temperatureCelsius, pulseBpm, weightKg, heightCm, symptoms, examinationNotes,
                diagnosis, treatmentPlan, prescriptions, labRequests, null);
    }
}
