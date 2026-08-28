package com.eclinician.domains.dtos.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * What a hospital administrator may change about their own clinic: what it is called and
 * the colour it wears. Not the modules — those are the subscription, and only the
 * platform sells those.
 */
public record ClinicSettingsRequest(
        @NotBlank @Size(max = 150) String name,
        @NotBlank @Pattern(regexp = "^#[0-9a-fA-F]{6}$", message = "Use a hex colour like #0f766e")
        String primaryColor) {}
