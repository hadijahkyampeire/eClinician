package com.eclinician;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.eclinician.domains.dtos.AppointmentRequest;
import com.eclinician.domains.entities.Patient;
import com.eclinician.repositories.PatientRepository;
import com.eclinician.domains.enums.UserRole;
import com.eclinician.services.AppointmentService;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class AuthTests {

    @Autowired MockMvc mvc;
    @Autowired PatientRepository patients;
    @Autowired TestAccounts accounts;
    @Autowired AppointmentService appointments;

    @Test
    void loginReturnsATokenAndTheRoleTheFrontendRenders() throws Exception {
        String email = accounts.create("login-hospital");

        mvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body(email, TestAccounts.PASSWORD)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.role").value("Clinician"))
                .andExpect(jsonPath("$.tenantId").value("login-hospital"));
    }

    @Test
    void aWrongPasswordIsRejected() throws Exception {
        String email = accounts.create("login-hospital");

        mvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body(email, "not-the-password")))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void theApiIsClosedWithoutAToken() throws Exception {
        mvc.perform(get("/api/patients"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void signedInUserCanUpdateOnlyTheirOwnProfile() throws Exception {
        String tenant = "profile-hospital";
        String bearer = accounts.bearerFor(tenant, UserRole.RECEPTIONIST);
        String image = "data:image/png;base64,iVBORw0KGgo=";

        mvc.perform(put("/api/auth/profile")
                        .header("Authorization", bearer)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Grace Updated\",\"profileImage\":\"" + image + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Grace Updated"))
                .andExpect(jsonPath("$.profileImage").value(image));

        mvc.perform(get("/api/auth/profile").header("Authorization", bearer))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Grace Updated"))
                .andExpect(jsonPath("$.role").value("Receptionist"));
    }

    @Test
    void profileRejectsContentThatIsNotAValidatedImage() throws Exception {
        String bearer = accounts.bearerFor("profile-image-hospital", UserRole.CLINICIAN);

        mvc.perform(put("/api/auth/profile")
                        .header("Authorization", bearer)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Doctor\",\"profileImage\":\"javascript:alert(1)\"}"))
                .andExpect(status().isConflict());
    }

    @Test
    void oneHospitalCannotReadAnothersPatients() throws Exception {
        Patient theirs = patients.save(patient("theirs-hospital"));

        // A valid token — for the wrong hospital. The tenant comes from the token, so
        // there is no header left to lie in.
        mvc.perform(get("/api/patients")
                        .header("Authorization", accounts.bearerFor(
                                "ours-hospital", UserRole.RECEPTIONIST)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isEmpty());

        mvc.perform(get("/api/patients/{id}", theirs.getId())
                        .header("Authorization", accounts.bearerFor(
                                "ours-hospital", UserRole.CLINICIAN)))
                .andExpect(status().isNotFound());
    }

    @Test
    void aClinicianHasNoPatientDirectoryAndTheirQueueContainsOnlyArrivals() throws Exception {
        String tenant = "clinician-visibility-hospital";
        Patient booked = patient(tenant);
        booked.setPhone("+256700000010");
        booked = patients.save(booked);
        Patient arrived = patient(tenant);
        arrived.setPhone("+256700000011");
        arrived = patients.save(arrived);

        appointments.schedule(tenant,
                new AppointmentRequest(booked.getId(), null, "Future review"));
        appointments.checkIn(tenant,
                new AppointmentRequest(arrived.getId(), null, "Walk-in"));
        String clinician = accounts.bearerFor(tenant, UserRole.CLINICIAN);

        mvc.perform(get("/api/patients").header("Authorization", clinician))
                .andExpect(status().isForbidden());

        mvc.perform(get("/api/appointments").header("Authorization", clinician))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].patientId").value(arrived.getId().toString()))
                .andExpect(jsonPath("$[0].status").value("CHECKED_IN"));
    }

    private String body(String email, String password) {
        return "{\"email\":\"" + email + "\",\"password\":\"" + password + "\"}";
    }

    private Patient patient(String tenantId) {
        Patient patient = new Patient();
        patient.setTenantId(tenantId);
        patient.setFirstName("Their");
        patient.setLastName("Patient");
        patient.setDateOfBirth(LocalDate.of(1988, 2, 2));
        patient.setSex("Male");
        patient.setPhone("+256700000009");
        return patient;
    }
}
