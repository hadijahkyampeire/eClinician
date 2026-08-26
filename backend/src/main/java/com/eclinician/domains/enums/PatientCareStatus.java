package com.eclinician.domains.enums;

/** A patient's current operational state. Null means no active care workflow. */
public enum PatientCareStatus {
    CHECKED_IN,
    WAITING,
    IN_SESSION,
    /** Sent for tests mid-consultation. The visit is paused, not finished: the clinician
     * still holds an open encounter, and the patient comes back to it. */
    LAB,
    /** The consultation is complete, but prescribed medicine is still awaiting pharmacy. */
    PHARMACY
}
