package com.eclinician.domains.dtos.request;

/** Deactivate or restore — the same one flag for a staff member or a hospital. */
public record ActiveRequest(boolean active) {}
