package com.eclinician.services;

import com.eclinician.domains.entities.AppUser;
import com.eclinician.domains.entities.Appointment;
import com.eclinician.domains.entities.Encounter;
import com.eclinician.domains.entities.LabOrder;
import com.eclinician.domains.entities.Patient;
import com.eclinician.domains.entities.PrescriptionOrder;
import com.eclinician.domains.enums.AppointmentStatus;
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
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

/**
 * Two patients with a past, so the demo has something to pull up rather than an empty
 * record. Grace is still in the building — checked in and waiting, which is what the
 * clinician takes into session. Peter has been through the whole loop twice and gone
 * home: check him in again and his history is already there, one encounter longer.
 */
@Component
@Order(4)
public class DemoHistorySeeder implements CommandLineRunner {

    private static final String TENANT = "hk-clinics";
    private static final String DOCTOR = "hkdoctor@hkclinics.com";
    private static final String RETURNING_ID = "CM8811047GH9";

    private final PatientRepository patients;
    private final AppointmentRepository appointments;
    private final EncounterRepository encounters;
    private final PrescriptionOrderRepository prescriptions;
    private final LabOrderRepository labs;
    private final UserRepository users;

    public DemoHistorySeeder(PatientRepository patients, AppointmentRepository appointments,
            EncounterRepository encounters, PrescriptionOrderRepository prescriptions,
            LabOrderRepository labs, UserRepository users) {
        this.patients = patients;
        this.appointments = appointments;
        this.encounters = encounters;
        this.prescriptions = prescriptions;
        this.labs = labs;
        this.users = users;
    }

    @Override
    public void run(String... args) {
        if (patients.findFirstByTenantIdAndNationalIdIgnoreCase(TENANT, RETURNING_ID).isPresent()) return;
        AppUser doctor = users.findByEmailIgnoreCase(DOCTOR).orElse(null);
        if (doctor == null) return;

        stillHere(register("Grace", "Nabirye", LocalDate.of(1994, 6, 18), "Female",
                "+256700777888", "CF9406187XY1", "6 Bombo Road", "Kampala"), doctor);

        Patient returning = register("Peter", "Ochieng", LocalDate.of(1988, 11, 4), "Male",
                "+256700999000", RETURNING_ID, "31 Lake View Close", "Jinja");
        closedVisit(returning, doctor, Duration.ofDays(43), new Visit(
                "Fever and headache for three days",
                38.9, 96, "Hot to touch, no neck stiffness, chest clear",
                "Malaria (P. falciparum)",
                "Treat as uncomplicated malaria. Fluids, review if the fever persists past 48 hours.",
                "Artemether-lumefantrine 80/480mg, twice daily for 3 days\nParacetamol 1g, up to 3 times daily",
                "Malaria rapid diagnostic test",
                "Positive for P. falciparum"));
        closedVisit(returning, doctor, Duration.ofDays(21), new Visit(
                "Follow-up: tired since the malaria, no fever",
                36.8, 78, "Afebrile, mildly pale conjunctiva, otherwise well",
                "Post-malarial anaemia, mild",
                "Iron for six weeks. Repeat the blood count at the next visit.",
                "Ferrous sulphate 200mg, once daily for 6 weeks",
                "Full blood count",
                "Hb 10.4 g/dL — mild anaemia, no other abnormality"));
    }

    /** Checked in this morning and sitting in the waiting room, ready to be taken in. */
    private void stillHere(Patient patient, AppUser doctor) {
        patient.setActiveCareStatus(PatientCareStatus.WAITING);
        patients.save(patient);

        Instant arrived = Instant.now().minus(Duration.ofMinutes(40));
        Appointment visit = new Appointment();
        visit.setTenantId(TENANT);
        visit.setPatientId(patient.getId());
        visit.setDoctorId(doctor.getId());
        visit.setStatus(AppointmentStatus.WAITING);
        visit.setScheduledAt(arrived);
        visit.setCheckedInAt(arrived);
        visit.setWaitingAt(Instant.now().minus(Duration.ofMinutes(34)));
        visit.setReason("Cough and sore throat");
        appointments.save(visit);
    }

    /**
     * One visit walked all the way through: seen, documented, dispensed, resulted, closed.
     * Every row is stamped with when it actually happened rather than when the seeder ran,
     * so a dashboard filtered to "today" does not turn up a visit from six weeks ago.
     */
    private void closedVisit(Patient patient, AppUser doctor, Duration ago, Visit notes) {
        Instant arrived = Instant.now().minus(ago);

        Appointment visit = new Appointment();
        visit.setTenantId(TENANT);
        visit.setPatientId(patient.getId());
        visit.setDoctorId(doctor.getId());
        visit.setStatus(AppointmentStatus.COMPLETED);
        visit.setScheduledAt(arrived);
        visit.setCheckedInAt(arrived);
        visit.setSessionStartedAt(arrived.plus(Duration.ofMinutes(25)));
        visit.setCompletedAt(arrived.plus(Duration.ofMinutes(55)));
        visit.setReason(notes.chiefComplaint());
        visit.setCreatedAt(arrived);
        appointments.save(visit);

        Encounter record = new Encounter();
        record.setTenantId(TENANT);
        record.setPatientId(patient.getId());
        record.setAppointmentId(visit.getId());
        record.setStatus(EncounterStatus.FINALIZED);
        record.setClinicianName(doctor.getName());
        record.setChiefComplaint(notes.chiefComplaint());
        record.setBloodPressure("118/76");
        record.setTemperatureCelsius(notes.temperature());
        record.setPulseBpm(notes.pulse());
        record.setWeightKg(71.0);
        record.setSymptoms(notes.chiefComplaint());
        record.setExaminationNotes(notes.examination());
        record.setDiagnosis(notes.diagnosis());
        record.setTreatmentPlan(notes.plan());
        record.setPrescriptions(notes.prescriptions());
        record.setLabRequests(notes.test());
        record.setFinalizedAt(arrived.plus(Duration.ofMinutes(55)));
        record.setCreatedAt(arrived.plus(Duration.ofMinutes(25)));
        encounters.save(record);

        for (String medication : notes.prescriptions().split("\n")) {
            PrescriptionOrder order = new PrescriptionOrder();
            order.setTenantId(TENANT);
            order.setPatientId(patient.getId());
            order.setEncounterId(record.getId());
            order.setMedication(medication.trim());
            order.setStatus(PrescriptionStatus.DISPENSED);
            order.setDispensedBy("John Etyang");
            order.setDispensedAt(arrived.plus(Duration.ofMinutes(80)));
            order.setCreatedAt(arrived.plus(Duration.ofMinutes(55)));
            prescriptions.save(order);
        }

        LabOrder test = new LabOrder();
        test.setTenantId(TENANT);
        test.setPatientId(patient.getId());
        test.setEncounterId(record.getId());
        test.setTestName(notes.test());
        test.setStatus(LabStatus.COMPLETED);
        test.setResult(notes.result());
        test.setResultedBy("Peter Ssali");
        test.setResultedAt(arrived.plus(Duration.ofMinutes(70)));
        test.setCreatedAt(arrived.plus(Duration.ofMinutes(55)));
        labs.save(test);
    }

    private Patient register(String firstName, String lastName, LocalDate born, String sex,
            String phone, String governmentId, String addressLine, String city) {
        Patient patient = new Patient();
        patient.setTenantId(TENANT);
        patient.setFirstName(firstName);
        patient.setLastName(lastName);
        patient.setDateOfBirth(born);
        patient.setSex(sex);
        patient.setPhone(phone);
        patient.setEmail(firstName.toLowerCase() + "." + lastName.toLowerCase() + "@example.com");
        patient.setNationalId(governmentId);
        patient.setAddressLine(addressLine);
        patient.setCity(city);
        patient.setDistrict(city);
        patient.setStateProvince("Central Region");
        patient.setCountry("UG");
        return patients.save(patient);
    }

    private record Visit(String chiefComplaint, Double temperature, Integer pulse,
            String examination, String diagnosis, String plan, String prescriptions,
            String test, String result) {
    }
}
