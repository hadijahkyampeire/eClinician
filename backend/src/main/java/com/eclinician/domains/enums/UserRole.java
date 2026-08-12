package com.eclinician.domains.enums;

/** The roles the dashboards are built around. */
public enum UserRole {
    ADMINISTRATOR("Administrator"),
    CLINICIAN("Clinician"),
    RECEPTIONIST("Receptionist"),
    PHARMACIST("Pharmacist"),
    LAB_TECHNICIAN("Lab Technician");

    private final String label;

    UserRole(String label) {
        this.label = label;
    }

    /** What the frontend already calls this role, so login can answer in its language. */
    public String label() {
        return label;
    }
}
