package com.eclinician.domains.dtos;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** A signed-in member of staff changing their own password. */
public record PasswordChangeRequest(
        @NotBlank String currentPassword,
        @NotBlank @Size(min = 8, max = 100) String newPassword) {}
