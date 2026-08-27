package com.eclinician.domains.dtos.response;

import com.eclinician.domains.entities.Patient;
import java.time.Instant;
import java.time.LocalDate;
import java.time.Period;

/**
 * A patient as the platform console sees them — deliberately de-identified.
 *
 * <p>The platform operator needs to know how many patients a hospital carries and how
 * busy it is; it has no reason to learn who those patients are. So no name, no phone and
 * no government ID crosses this boundary: only a short reference, the demographics that
 * make a census meaningful, and where the patient sits in the clinic's flow.
 */
public record PlatformPatientRow(
        String reference,
        String sex,
        Integer age,
        String careStatus,
        Instant registeredAt,
        String hospitalId,
        String hospitalName) {

    public static PlatformPatientRow from(Patient patient, String hospitalName) {
        LocalDate born = patient.getDateOfBirth();
        return new PlatformPatientRow(
                patient.getId().toString().substring(0, 8).toUpperCase(),
                patient.getSex(),
                born == null ? null : Period.between(born, LocalDate.now()).getYears(),
                patient.getActiveCareStatus() == null
                        ? null : patient.getActiveCareStatus().name(),
                patient.getCreatedAt(), patient.getTenantId(), hospitalName);
    }
}
