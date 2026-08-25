package com.eclinician.services;

import com.eclinician.domains.entities.Appointment;
import com.eclinician.domains.enums.AppointmentStatus;
import com.eclinician.repositories.AppointmentRepository;
import com.eclinician.repositories.PatientRepository;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.EnumSet;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * A check-in is good for the day it was made. This is an outpatient clinic — nobody
 * stays overnight — so a visit still open from an earlier day is someone who left
 * without being seen. We settle it the moment anyone looks, rather than on a clock.
 */
@Component
public class CheckInExpiry {

    private static final Logger log = LoggerFactory.getLogger(CheckInExpiry.class);
    private static final EnumSet<AppointmentStatus> ARRIVED =
            EnumSet.of(AppointmentStatus.CHECKED_IN, AppointmentStatus.WAITING);

    private final AppointmentRepository appointments;
    private final PatientRepository patients;
    private final ClinicClock clock;
    private final TransactionTemplate cleanupTransaction;

    public CheckInExpiry(AppointmentRepository appointments, PatientRepository patients,
            ClinicClock clock, PlatformTransactionManager transactionManager) {
        this.appointments = appointments;
        this.patients = patients;
        this.clock = clock;
        this.cleanupTransaction = new TransactionTemplate(transactionManager);
        this.cleanupTransaction.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    }

    /**
     * Marks every check-in left over from an earlier day as a no-show and frees the
     * patient for new care. Usually finds nothing, on one indexed query.
     */
    public void sweep(String tenantId) {
        try {
            cleanupTransaction.executeWithoutResult(status -> expireStaleCheckIns(tenantId));
        } catch (RuntimeException exception) {
            // This is housekeeping, not a prerequisite for reading clinical data. Keep
            // the API available and leave a useful production trace for the next deploy.
            log.error("Could not expire stale check-ins for tenant {}; continuing request",
                    tenantId, exception);
        }
    }

    private void expireStaleCheckIns(String tenantId) {
        // "Today" starts at midnight where the clinic is, not where the server is.
        Instant dayStart = clock.startOfToday(tenantId);
        List<Appointment> stale = appointments
                .findByTenantIdAndStatusInAndCheckedInAtBefore(tenantId, ARRIVED, dayStart);

        for (Appointment appointment : stale) {
            appointment.setStatus(AppointmentStatus.NO_SHOW);
            patients.findByIdAndTenantId(appointment.getPatientId(), tenantId)
                    .ifPresent(patient -> {
                        patient.setActiveCareStatus(null);
                        patients.save(patient);
                    });
        }
        appointments.saveAll(stale);
    }
}
