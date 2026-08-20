package com.eclinician.domains.enums;

/** A feature a hospital's subscription can switch on or off. */
public enum ClinicModule {
    PATIENTS,
    APPOINTMENTS,
    RECORDS,
    PHARMACY,
    LABORATORY;

    /** What the frontend calls this module in its navigation table. */
    public String key() {
        return name().toLowerCase();
    }
}
