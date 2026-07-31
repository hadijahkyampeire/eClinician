package com.eclinician.appointment;

/** Permanent lifecycle state recorded on an appointment. */
public enum AppointmentStatus {
    SCHEDULED,
    CHECKED_IN,
    WAITING,
    IN_SESSION,
    COMPLETED,
    CANCELLED,
    NO_SHOW
}
