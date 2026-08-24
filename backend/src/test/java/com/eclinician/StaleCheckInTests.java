package com.eclinician;

import com.eclinician.domains.dtos.AppointmentRequest;
import com.eclinician.domains.dtos.AppointmentResponse;
import com.eclinician.domains.entities.Appointment;
import com.eclinician.domains.entities.Patient;
import com.eclinician.domains.enums.AppointmentStatus;
import com.eclinician.repositories.AppointmentRepository;
import com.eclinician.repositories.PatientRepository;
import com.eclinician.services.AppointmentService;
import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

/** A check-in only lasts the day: this is an outpatient clinic, nobody stays over. */
@SpringBootTest
class StaleCheckInTests {

    private static final String TENANT = "workflow-test-hospital";

    @Autowired
    private AppointmentService service;

    @Autowired
    private AppointmentRepository appointments;

    @Autowired
    private PatientRepository patients;

    @Test
    void aCheckInLeftOpenOvernightIsSettledAsANoShowAndFreesThePatient() {
        Patient patient = walkIn("+256700000042");
        AppointmentResponse arrival = service.checkIn(
                TENANT, new AppointmentRequest(patient.getId(), null, "Walk-in"));

        rewindArrivalToYesterday(arrival.id());
        service.list(TENANT, patient.getId());

        assertThat(appointments.findById(arrival.id()).orElseThrow().getStatus())
                .isEqualTo(AppointmentStatus.NO_SHOW);
        assertThat(patients.findById(patient.getId()).orElseThrow().getActiveCareStatus())
                .isNull();
    }

    @Test
    void yesterdaysCheckInNoLongerBlocksTodaysBooking() {
        Patient patient = walkIn("+256700000043");
        AppointmentResponse arrival = service.checkIn(
                TENANT, new AppointmentRequest(patient.getId(), null, "Walk-in"));
        rewindArrivalToYesterday(arrival.id());

        AppointmentResponse booked = service.schedule(
                TENANT, new AppointmentRequest(patient.getId(), null, "Follow-up"));

        assertThat(booked.status()).isEqualTo(AppointmentStatus.SCHEDULED);
        assertThat(booked.id()).isNotEqualTo(arrival.id());
    }

    @Test
    void arrivingAgainTodayStartsAFreshVisitRatherThanReusingYesterdays() {
        Patient patient = walkIn("+256700000044");
        AppointmentResponse yesterday = service.checkIn(
                TENANT, new AppointmentRequest(patient.getId(), null, "Walk-in"));
        rewindArrivalToYesterday(yesterday.id());

        AppointmentResponse today = service.checkIn(
                TENANT, new AppointmentRequest(patient.getId(), null, "Walk-in"));

        assertThat(today.id()).isNotEqualTo(yesterday.id());
        assertThat(today.checkedInAt()).isAfter(Instant.now().minus(1, ChronoUnit.HOURS));
    }

    private void rewindArrivalToYesterday(java.util.UUID appointmentId) {
        Appointment stale = appointments.findById(appointmentId).orElseThrow();
        stale.setCheckedInAt(Instant.now().minus(1, ChronoUnit.DAYS));
        appointments.saveAndFlush(stale);
    }

    private Patient walkIn(String phone) {
        Patient patient = new Patient();
        patient.setTenantId(TENANT);
        patient.setFirstName("Stale");
        patient.setLastName("Arrival");
        patient.setDateOfBirth(LocalDate.of(1990, 1, 1));
        patient.setSex("Other");
        patient.setPhone(phone);
        return patients.save(patient);
    }
}
