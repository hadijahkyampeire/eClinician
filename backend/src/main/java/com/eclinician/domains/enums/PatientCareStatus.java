package com.eclinician.domains.enums;

/** A patient's current operational state. Null means no active care workflow. */
public enum PatientCareStatus {
    CHECKED_IN,
    WAITING,
    IN_SESSION
}
