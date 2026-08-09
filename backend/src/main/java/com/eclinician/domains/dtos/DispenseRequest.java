package com.eclinician.domains.dtos;

import com.eclinician.domains.enums.PrescriptionStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** The pharmacist's decision on one medicine: dispensed, or unavailable and why. */
public record DispenseRequest(
        @NotNull PrescriptionStatus status,
        @NotBlank @Size(max = 150) String pharmacistName,
        @Size(max = 500) String notes) {}

