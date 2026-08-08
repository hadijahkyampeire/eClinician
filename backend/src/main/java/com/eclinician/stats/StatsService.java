package com.eclinician.stats;

import com.eclinician.appointment.AppointmentRepository;
import com.eclinician.appointment.PatientCareStatus;
import com.eclinician.encounter.EncounterRepository;
import com.eclinician.encounter.EncounterStatus;
import com.eclinician.patient.PatientRepository;
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

    StatsService(PatientRepository patients, AppointmentRepository appointments,
            EncounterRepository encounters) {
        this.patients = patients;
        this.appointments = appointments;
        this.encounters = encounters;
    }

    DashboardStats dashboard(String tenantId) {
        // "Today" follows the server clock; set TZ on the host to match the clinic.
        Instant dayStart = LocalDate.now().atStartOfDay(ZoneId.systemDefault()).toInstant();
        Instant dayEnd = dayStart.plus(1, ChronoUnit.DAYS);

        return new DashboardStats(
                patients.countByTenantId(tenantId),
                patients.countByTenantIdAndCreatedAtAfter(tenantId, dayStart),
                patients.countByTenantIdAndActiveCareStatus(tenantId, PatientCareStatus.CHECKED_IN),
                patients.countByTenantIdAndActiveCareStatus(tenantId, PatientCareStatus.WAITING),
                patients.countByTenantIdAndActiveCareStatus(tenantId, PatientCareStatus.IN_SESSION),
                appointments.countByTenantIdAndScheduledAtBetween(tenantId, dayStart, dayEnd),
                encounters.countByTenantIdAndStatus(tenantId, EncounterStatus.DRAFT),
                encounters.countByTenantIdAndFinalizedAtAfter(tenantId, dayStart),
                encounters.countClinicians(tenantId),
                encounters.countWithPrescriptions(tenantId),
                encounters.countWithLabRequests(tenantId));
    }
}
