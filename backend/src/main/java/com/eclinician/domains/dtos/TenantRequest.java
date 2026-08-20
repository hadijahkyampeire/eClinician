package com.eclinician.domains.dtos;

import com.eclinician.domains.enums.ClinicModule;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.List;

/** What the platform administrator sets when onboarding or editing a hospital. */
public record TenantRequest(
        // The slug lands in every row this hospital owns, so it is url-safe and fixed.
        @NotBlank @Size(max = 60)
        @Pattern(regexp = "^[a-z0-9]+(-[a-z0-9]+)*$",
                message = "Use lowercase letters, numbers and hyphens")
        String id,

        @NotBlank @Size(max = 150) String name,

        @NotBlank @Pattern(regexp = "^#[0-9a-fA-F]{6}$", message = "Use a hex colour like #0f766e")
        String primaryColor,

        @NotNull List<ClinicModule> modules) {}
