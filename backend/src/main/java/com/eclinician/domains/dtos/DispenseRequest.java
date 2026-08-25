package com.eclinician.domains.dtos;

import com.eclinician.domains.enums.PrescriptionStatus;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * The pharmacist's decision on one medicine: dispensed, or unavailable and why.
 * Who dispensed it is taken from the caller's token, not from this body.
 */
public record DispenseRequest(
        @NotNull PrescriptionStatus status,

        /**
         * What was actually handed over, when it is not what was prescribed — an
         * equivalent agreed with the clinician. Left null to mean "the medicine as
         * prescribed", which the service fills in so the record is never ambiguous.
         */
        @Size(max = 500) String dispensedMedication,

        /** How much went out. Optional: a pharmacy that does not count yet can skip it. */
        @Min(1) Integer quantityDispensed,

        @Size(max = 30) String dispenseUnit,

        /**
         * What is in each container — "100 ml" for a bottle of syrup. Left empty for a
         * unit that is already a measure, like tablets.
         */
        @Size(max = 40) String packSize,

        @Size(max = 500) String notes) {

    /** Marking something unavailable needs only a reason. */
    public DispenseRequest(PrescriptionStatus status, String notes) {
        this(status, null, null, null, null, notes);
    }

    /** Dispensing something that is its own measure — tablets, capsules, loose ml. */
    public DispenseRequest(PrescriptionStatus status, String dispensedMedication,
            Integer quantityDispensed, String dispenseUnit, String notes) {
        this(status, dispensedMedication, quantityDispensed, dispenseUnit, null, notes);
    }
}
