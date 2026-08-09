package com.eclinician.domains.enums;

/** Where a single prescribed medicine has got to in the pharmacy. */
public enum PrescriptionStatus {
    /** Clinician prescribed it; pharmacy has not acted yet. */
    PENDING,
    /** Handed to the patient. Terminal. */
    DISPENSED,
    /** Pharmacy cannot supply it. Reversible — stock arrives, it gets dispensed. */
    UNAVAILABLE
}
