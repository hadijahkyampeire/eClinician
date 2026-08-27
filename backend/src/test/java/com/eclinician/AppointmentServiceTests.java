package com.eclinician;

import com.eclinician.domains.dtos.request.AppointmentRequest;
import com.eclinician.domains.dtos.response.AppointmentResponse;
import com.eclinician.domains.entities.AppUser;
import com.eclinician.domains.entities.Patient;
import com.eclinician.domains.enums.AppointmentStatus;
import com.eclinician.domains.enums.PatientCareStatus;
import com.eclinician.domains.enums.UserRole;
import com.eclinician.repositories.PatientRepository;
import com.eclinician.repositories.UserRepository;
import com.eclinician.services.AppointmentService;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.LocalDate;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class AppointmentServiceTests {

    @Autowired
    private AppointmentService service;

    @Autowired
    private PatientRepository patients;

    @Autowired
    private UserRepository users;

    @Test
    void completingVisitClearsActivePatientStatusButPreservesHistory() {
        Patient patient = new Patient();
        patient.setTenantId("workflow-test-hospital");
        patient.setFirstName("Test");
        patient.setLastName("Patient");
        patient.setDateOfBirth(LocalDate.of(1990, 1, 1));
        patient.setSex("Other");
        patient.setPhone("+256700000001");
        patient = patients.save(patient);

        AppointmentResponse checkedIn = service.checkIn(
                patient.getTenantId(),
                new AppointmentRequest(patient.getId(), null, null, "Walk-in", false));
        assertThat(checkedIn.status()).isEqualTo(AppointmentStatus.CHECKED_IN);
        assertThat(patients.findById(patient.getId()).orElseThrow().getActiveCareStatus())
                .isEqualTo(PatientCareStatus.CHECKED_IN);

        AppointmentResponse waiting = service.markWaiting(
                patient.getTenantId(), checkedIn.id());
        assertThat(waiting.status()).isEqualTo(AppointmentStatus.WAITING);
        assertThat(waiting.waitingAt()).isNotNull().isAfterOrEqualTo(checkedIn.checkedInAt());
        assertThat(patients.findById(patient.getId()).orElseThrow().getActiveCareStatus())
                .isEqualTo(PatientCareStatus.WAITING);
        String tenantId = patient.getTenantId();
        assertThatThrownBy(() -> service.markWaiting(tenantId, checkedIn.id()))
                .isInstanceOf(com.eclinician.exceptions.ConflictException.class)
                .hasMessageContaining("checked_in");

        AppointmentResponse inSession = service.startSession(
                patient.getTenantId(), patient.getId());
        assertThat(inSession.status()).isEqualTo(AppointmentStatus.IN_SESSION);

        AppointmentResponse completed = service.complete(
                patient.getTenantId(), checkedIn.id());
        assertThat(completed.status()).isEqualTo(AppointmentStatus.COMPLETED);
        assertThat(completed.completedAt()).isNotNull();
        assertThat(patients.findById(patient.getId()).orElseThrow().getActiveCareStatus())
                .isNull();
        assertThat(service.list(patient.getTenantId(), patient.getId()))
                .singleElement()
                .extracting(AppointmentResponse::status)
                .isEqualTo(AppointmentStatus.COMPLETED);
    }

    @Test
    void anAssignedPatientAppearsOnlyInThatCliniciansQueue() {
        String tenant = "specialist-routing-hospital";
        AppUser dentist = clinician(tenant, "dentist@routing.test", "Dentist");
        AppUser pediatrician = clinician(tenant, "paed@routing.test", "Pediatrician");

        Patient patient = new Patient();
        patient.setTenantId(tenant);
        patient.setFirstName("Queue");
        patient.setLastName("Patient");
        patient.setPhone("+256700000099");
        patient = patients.save(patient);

        AppointmentResponse arrival = service.checkIn(tenant,
                new AppointmentRequest(patient.getId(), dentist.getId(), null, "Tooth pain", false));

        assertThat(service.list(tenant, null, dentist.getEmail()))
                .singleElement().extracting(AppointmentResponse::id).isEqualTo(arrival.id());
        assertThat(service.list(tenant, null, pediatrician.getEmail())).isEmpty();
        java.util.UUID patientId = patient.getId();
        assertThatThrownBy(() -> service.startSession(tenant, patientId, pediatrician.getEmail()))
                .isInstanceOf(com.eclinician.exceptions.ConflictException.class)
                .hasMessageContaining("assigned to you");
        assertThat(service.startSession(tenant, patientId, dentist.getEmail()).doctorId())
                .isEqualTo(dentist.getId());
    }

    private AppUser clinician(String tenant, String email, String specialty) {
        AppUser doctor = new AppUser();
        doctor.setTenantId(tenant);
        doctor.setName("Dr " + specialty);
        doctor.setEmail(email);
        doctor.setPasswordHash("not-used-in-this-service-test");
        doctor.setRole(UserRole.CLINICIAN);
        doctor.setSpecialty(specialty);
        doctor.setActive(true);
        return users.save(doctor);
    }
}
