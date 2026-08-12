package com.eclinician.domains.enums;

/** Where a single requested test has got to in the lab. */
public enum LabStatus {
    /** Clinician requested it; the lab has not acted yet. */
    PENDING,
    /** Result recorded. Terminal. */
    COMPLETED,
    /** The lab cannot run it — no reagent, unusable sample. Reversible. */
    CANCELLED
}
