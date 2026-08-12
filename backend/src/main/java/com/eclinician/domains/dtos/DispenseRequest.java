package com.eclinician.domains.dtos;

import com.eclinician.domains.enums.PrescriptionStatus;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * The pharmacist's decision on one medicine: dispensed, or unavailable and why.
 * Who dispensed it is taken from the caller's token, not from this body.
 */
public record DispenseRequest(
        @NotNull PrescriptionStatus status,
        @Size(max = 500) String notes) {}
