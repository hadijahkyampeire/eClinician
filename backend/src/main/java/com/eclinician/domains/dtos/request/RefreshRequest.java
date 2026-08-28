package com.eclinician.domains.dtos.request;

import jakarta.validation.constraints.NotBlank;

/** The refresh token, on its way back to be spent for a new one. */
public record RefreshRequest(
        @NotBlank String refreshToken) {}
