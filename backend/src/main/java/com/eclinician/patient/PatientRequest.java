package com.eclinician.patient;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Past;
import java.time.LocalDate;

/** Incoming payload for creating or updating a patient. */
public record PatientRequest(
        @NotBlank String firstName,
        @NotBlank String lastName,
        @Past LocalDate dateOfBirth,
        String sex,
        String phone,
        @Email String email,
        String nationalId,
        String address) {
}
