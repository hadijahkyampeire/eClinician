package com.eclinician.services;

import com.eclinician.domains.dtos.response.DashboardStats;
import com.eclinician.domains.entities.AppUser;
import com.eclinician.domains.enums.EncounterStatus;
import com.eclinician.domains.enums.LabStatus;
import com.eclinician.domains.enums.PatientCareStatus;
import com.eclinician.domains.enums.PrescriptionStatus;
import com.eclinician.repositories.AppointmentRepository;
import com.eclinician.repositories.EncounterRepository;
import com.eclinician.repositories.LabOrderRepository;
import com.eclinician.repositories.PatientRepository;
import com.eclinician.repositories.PrescriptionOrderRepository;
import com.eclinician.repositories.UserRepository;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import org.springframework.stereotype.Service;

@Service
public class StatsService {

    private final PatientRepository patients;
    private final AppointmentRepository appointments;
    private final EncounterRepository encounters;
    private final PrescriptionOrderRepository orders;
    private final LabOrderRepository labOrders;
    private final CheckInExpiry expiry;
    private final UserRepository users;
    private final ClinicClock clock;

    public StatsService(PatientRepository patients, AppointmentRepository appointments,
            EncounterRepository encounters, PrescriptionOrderRepository orders,
            LabOrderRepository labOrders, CheckInExpiry expiry, UserRepository users, ClinicClock clock) {
        this.patients = patients;
        this.appointments = appointments;
        this.encounters = encounters;
        this.orders = orders;
        this.labOrders = labOrders;
        this.expiry = expiry;
        this.users = users;
        this.clock = clock;
    }

    public DashboardStats dashboard(String tenantId) {
        return dashboard(tenantId, null);
    }

    public DashboardStats dashboard(String tenantId, String clinicianEmail) {
        // Clears yesterday's leftovers so the waiting-room tiles count today only.
        expiry.sweep(tenantId);

        // "Today" starts at midnight where the clinic is, not where the server is.
        Instant dayStart = clock.startOfToday(tenantId);
        Instant dayEnd = dayStart.plus(1, ChronoUnit.DAYS);
        AppUser clinician = clinicianEmail == null ? null
                : users.findByEmailIgnoreCase(clinicianEmail)
                        .filter(user -> tenantId.equals(user.getTenantId()))
                        .orElse(null);
        long checkedIn = clinician == null
                ? patients.countByTenantIdAndActiveCareStatus(tenantId, PatientCareStatus.CHECKED_IN)
                : appointments.countVisibleToClinician(
                        tenantId, com.eclinician.domains.enums.AppointmentStatus.CHECKED_IN,
                        clinician.getId());
        long waiting = clinician == null
                ? patients.countByTenantIdAndActiveCareStatus(tenantId, PatientCareStatus.WAITING)
                : appointments.countVisibleToClinician(
                        tenantId, com.eclinician.domains.enums.AppointmentStatus.WAITING,
                        clinician.getId());
        long inSession = clinician == null
                ? patients.countByTenantIdAndActiveCareStatus(tenantId, PatientCareStatus.IN_SESSION)
                : appointments.countVisibleToClinician(
                        tenantId, com.eclinician.domains.enums.AppointmentStatus.IN_SESSION,
                        clinician.getId());
        long drafts = clinician == null
                ? encounters.countByTenantIdAndStatus(tenantId, EncounterStatus.DRAFT)
                : encounters.countByTenantIdAndClinicianNameAndStatus(
                        tenantId, clinician.getName(), EncounterStatus.DRAFT);
        long finalized = clinician == null
                ? encounters.countByTenantIdAndFinalizedAtAfter(tenantId, dayStart)
                : encounters.countByTenantIdAndClinicianNameAndFinalizedAtAfter(
                        tenantId, clinician.getName(), dayStart);

        return new DashboardStats(
                patients.countByTenantId(tenantId),
                patients.countByTenantIdAndCreatedAtAfter(tenantId, dayStart),
                checkedIn,
                waiting,
                inSession,
                appointments.countByTenantIdAndScheduledAtBetween(tenantId, dayStart, dayEnd),
                drafts,
                finalized,
                encounters.countClinicians(tenantId),
                orders.countByTenantIdAndStatus(tenantId, PrescriptionStatus.PENDING),
                orders.countByTenantIdAndStatusAndDispensedAtAfter(tenantId,
                        PrescriptionStatus.DISPENSED, dayStart),
                orders.countByTenantIdAndStatus(tenantId, PrescriptionStatus.UNAVAILABLE),
                labOrders.countByTenantIdAndStatus(tenantId, LabStatus.PENDING),
                labOrders.countByTenantIdAndStatusAndResultedAtAfter(tenantId,
                        LabStatus.COMPLETED, dayStart),
                labOrders.countByTenantIdAndStatus(tenantId, LabStatus.CANCELLED));
    }
}
