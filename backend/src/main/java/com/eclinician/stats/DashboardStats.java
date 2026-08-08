package com.eclinician.stats;

/** Live counts behind the role dashboards. Every figure is tenant-scoped. */
public record DashboardStats(
        long totalPatients,
        long newPatientsToday,
        long checkedIn,
        long waiting,
        long inSession,
        long appointmentsToday,
        long draftEncounters,
        long finalizedToday,
        long clinicians,
        long prescriptionsRaised,
        long labRequestsRaised) {}
