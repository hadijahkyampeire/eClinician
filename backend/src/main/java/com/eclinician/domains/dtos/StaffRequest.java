package com.eclinician.domains.dtos;

import com.eclinician.domains.enums.UserRole;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * What an administrator may set on a staff account. The email is only read when the
 * account is created — the SRS makes it unwritable afterwards — and the password is
 * optional on update, meaning "leave it as it is".
 */
public record StaffRequest(
        @NotBlank @Size(max = 150) String name,
        @NotBlank @Email @Size(max = 200) String email,
        @NotNull UserRole role,
        @Size(min = 8, max = 100) String password) {}
