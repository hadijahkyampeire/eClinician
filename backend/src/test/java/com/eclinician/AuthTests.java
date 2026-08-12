package com.eclinician;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.eclinician.domains.entities.Patient;
import com.eclinician.repositories.PatientRepository;
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
    void oneHospitalCannotReadAnothersPatients() throws Exception {
        patients.save(patient("theirs-hospital"));

        // A valid token — for the wrong hospital. The tenant comes from the token, so
        // there is no header left to lie in.
        mvc.perform(get("/api/patients")
                        .header("Authorization", accounts.bearerFor("ours-hospital")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isEmpty());
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
