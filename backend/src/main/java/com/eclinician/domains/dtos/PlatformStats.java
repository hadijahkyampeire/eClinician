package com.eclinician.domains.dtos;

/** The three counts behind the platform console, across every hospital. */
public record PlatformStats(long hospitals, long activeHospitals, long users) {}
