package com.eclinician.domains.dtos.response;

/** The three counts behind the platform console, across every hospital. */
public record PlatformStats(long hospitals, long activeHospitals, long users) {}
