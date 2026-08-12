package com.eclinician.domains.dtos;

import com.eclinician.domains.enums.LabStatus;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * The technician's decision on one test: a result, or cancelled and why.
 * Who resulted it is taken from the caller's token, not from this body.
 */
public record LabResultRequest(
        @NotNull LabStatus status,
        @Size(max = 2000) String result,
        @Size(max = 500) String notes) {}
