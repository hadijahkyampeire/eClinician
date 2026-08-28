package com.eclinician.domains.dtos.request;

import com.eclinician.domains.enums.ClinicModule;
import jakarta.validation.constraints.Email;
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

        @NotNull List<ClinicModule> modules,

        // Where the hospital is, in the shape international addresses agree on. Optional
        // throughout — a clinic can be onboarded before anyone has its address — but
        // subdivision and country are what the console filters on, so leaving them blank
        // means this hospital will not answer those filters.
        @Size(max = 255) String addressLine,
        @Size(max = 100) String city,
        /* District, state, province — whichever this country calls it. */
        @Size(max = 100) String subdivision,
        @Size(max = 20) String postalCode,
        @Pattern(regexp = "^([A-Za-z]{2})?$", message = "Use a two-letter country code")
        String country,
        @Size(max = 30) String phone,
        @Email @Size(max = 254) String email,

        /**
         * The clinic's own clock, as an IANA zone — "Africa/Kampala", "America/New_York".
         * Rota hours and every "today" are read in it. Blank keeps the current value.
         */
        @Size(max = 60) String timeZone,

        // Onboarding a hospital that nobody can sign in to is onboarding nothing, so the
        // console creates its first administrator in the same step. Ignored on update.
        @Size(max = 150) String adminName,
        @Email @Size(max = 200) String adminEmail,
        @Size(min = 8, max = 100) String adminPassword) {

    /** Editing an existing hospital, where the administrator already exists. */
    public TenantRequest(String id, String name, String primaryColor,
            List<ClinicModule> modules) {
        this(id, name, primaryColor, modules, null, null, null, null, null, null, null,
                null, null, null, null);
    }

    /** Onboarding, before anyone thought to record where the hospital is. */
    public TenantRequest(String id, String name, String primaryColor,
            List<ClinicModule> modules, String adminName, String adminEmail,
            String adminPassword) {
        this(id, name, primaryColor, modules, null, null, null, null, null, null, null,
                null, adminName, adminEmail, adminPassword);
    }
}
