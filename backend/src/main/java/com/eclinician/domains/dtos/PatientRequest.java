package com.eclinician.domains.dtos;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

/** Incoming payload for creating or updating a patient. */
public record PatientRequest(
        @NotBlank(message = "First name is required")
        @Size(max = 100, message = "First name must be 100 characters or fewer")
        String firstName,

        @NotBlank(message = "Last name is required")
        @Size(max = 100, message = "Last name must be 100 characters or fewer")
        String lastName,

        @NotNull(message = "Date of birth is required")
        @Past(message = "Date of birth must be in the past")
        LocalDate dateOfBirth,

        @NotBlank(message = "Sex is required")
        @Pattern(regexp = "Female|Male|Other", message = "Sex must be Female, Male, or Other")
        String sex,

        @NotBlank(message = "Phone number is required")
        @Pattern(regexp = "^\\+?[0-9 ()-]{7,20}$", message = "Enter a valid phone number")
        String phone,

        @Email(message = "Enter a valid email address")
        @Size(max = 254, message = "Email must be 254 characters or fewer")
        String email,

        @Size(max = 100, message = "Government-issued ID must be 100 characters or fewer")
        String nationalId,

        @Size(max = 255, message = "Address line must be 255 characters or fewer")
        String addressLine,

        @Size(max = 100, message = "City or locality must be 100 characters or fewer")
        String city,

        @Size(max = 100, message = "District or county must be 100 characters or fewer")
        String district,

        @Size(max = 100, message = "State, province, or region must be 100 characters or fewer")
        String stateProvince,

        @Pattern(regexp = "^$|^[A-Z]{2}$", message = "Country must be a valid two-letter country code")
        String country) {
}
