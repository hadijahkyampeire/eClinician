package com.eclinician.domains.dtos;

import com.eclinician.domains.enums.LabStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** The technician's decision on one test: a result, or cancelled and why. */
public record LabResultRequest(
        @NotNull LabStatus status,
        @NotBlank @Size(max = 150) String technicianName,
        @Size(max = 2000) String result,
        @Size(max = 500) String notes) {}
