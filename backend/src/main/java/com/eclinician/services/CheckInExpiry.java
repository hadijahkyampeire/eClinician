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
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * A check-in is good for the day it was made. This is an outpatient clinic — nobody
 * stays overnight — so a visit still open from an earlier day is someone who left
 * without being seen. We settle it the moment anyone looks, rather than on a clock.
 */
@Component
public class CheckInExpiry {

    private static final EnumSet<AppointmentStatus> ARRIVED =
            EnumSet.of(AppointmentStatus.CHECKED_IN, AppointmentStatus.WAITING);

    private final AppointmentRepository appointments;
    private final PatientRepository patients;

    public CheckInExpiry(AppointmentRepository appointments, PatientRepository patients) {
        this.appointments = appointments;
        this.patients = patients;
    }

    /**
     * Marks every check-in left over from an earlier day as a no-show and frees the
     * patient for new care. Usually finds nothing, on one indexed query.
     */
    @Transactional
    public void sweep(String tenantId) {
        // "Today" follows the server clock; set TZ on the host to match the clinic.
        Instant dayStart = LocalDate.now().atStartOfDay(ZoneId.systemDefault()).toInstant();
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
