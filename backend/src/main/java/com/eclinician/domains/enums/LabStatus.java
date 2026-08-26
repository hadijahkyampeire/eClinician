package com.eclinician.domains.enums;

/** Where a single requested test has got to in the lab. */
public enum LabStatus {
    /** Clinician requested it; the lab has not acted yet. */
    PENDING,
    /**
     * The specimen is taken and the test is running. The patient is free to go back to
     * the clinician — this is the state a culture sits in for two days, and the reason
     * nobody has to stand at the bench waiting for one.
     */
    IN_PROGRESS,
    /** Result recorded. Terminal. */
    COMPLETED,
    /** The lab cannot run it — no reagent, unusable sample. Reversible. */
    CANCELLED
}
