package com.eclinician.patient;

import com.eclinician.appointment.PatientCareStatus;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/** What we send back to the client. */
public record PatientResponse(
        UUID id,
        String firstName,
        String lastName,
        LocalDate dateOfBirth,
        String sex,
        String phone,
        String email,
        String nationalId,
        String addressLine,
        String city,
        String district,
        String stateProvince,
        String country,
        PatientCareStatus activeCareStatus,
        Instant createdAt,
        Instant updatedAt) {

    static PatientResponse from(Patient p) {
        return new PatientResponse(p.getId(), p.getFirstName(), p.getLastName(),
                p.getDateOfBirth(), p.getSex(), p.getPhone(), p.getEmail(),
                p.getNationalId(), p.getAddressLine(), p.getCity(), p.getDistrict(),
                p.getStateProvince(), p.getCountry(), p.getActiveCareStatus(),
                p.getCreatedAt(), p.getUpdatedAt());
    }
}
