package com.eclinician;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.eclinician.domains.entities.Patient;
import com.eclinician.domains.enums.UserRole;
import com.eclinician.repositories.PatientRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

/**
 * Two hospitals on one deployment must never see each other's people.
 *
 * <p>The tenant is not a parameter anyone sends — it is a claim inside the signed token,
 * put there at login and read back by the resolver, so a caller cannot ask for another
 * hospital's rows even deliberately. These go through the HTTP layer rather than the
 * services precisely to exercise that path.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class TenantIsolationTests {

    private static final String ONE = "isolation-one";
    private static final String TWO = "isolation-two";

    @Autowired MockMvc mvc;
    @Autowired PatientRepository patients;
    @Autowired TestAccounts accounts;

    @Test
    void aHospitalSeesOnlyItsOwnPatients() throws Exception {
        patient(ONE, "Ours", "Patient");
        patient(TWO, "Theirs", "Patient");

        mvc.perform(get("/api/patients").header(HttpHeaders.AUTHORIZATION, desk(ONE)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[?(@.firstName == 'Ours')]").isNotEmpty())
                .andExpect(jsonPath("$.content[?(@.firstName == 'Theirs')]").isEmpty());

        mvc.perform(get("/api/patients").header(HttpHeaders.AUTHORIZATION, desk(TWO)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[?(@.firstName == 'Theirs')]").isNotEmpty())
                .andExpect(jsonPath("$.content[?(@.firstName == 'Ours')]").isEmpty());
    }

    /** Naming another hospital's patient by id is not a way in either. */
    @Test
    void oneHospitalCannotFetchAnothersPatientById() throws Exception {
        Patient theirs = patient(TWO, "Private", "Record");

        mvc.perform(get("/api/patients/{id}", theirs.getId())
                        .header(HttpHeaders.AUTHORIZATION, desk(ONE)))
                .andExpect(status().isNotFound());
    }

    @Test
    void aHospitalSeesOnlyItsOwnStaffAndClinicians() throws Exception {
        accounts.create(ONE, UserRole.CLINICIAN);
        accounts.create(TWO, UserRole.CLINICIAN);
        String admin = accounts.bearerFor(ONE, UserRole.ADMINISTRATOR);

        mvc.perform(get("/api/staff").header(HttpHeaders.AUTHORIZATION, admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.email =~ /.*" + TWO + ".*/)]").isEmpty());

        mvc.perform(get("/api/staff/clinicians").header(HttpHeaders.AUTHORIZATION, admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.email =~ /.*" + TWO + ".*/)]").isEmpty());
    }

    private Patient patient(String tenantId, String first, String last) {
        Patient value = new Patient();
        value.setTenantId(tenantId);
        value.setFirstName(first);
        value.setLastName(last);
        return patients.save(value);
    }

    private String desk(String tenantId) {
        return accounts.bearerFor(tenantId, UserRole.RECEPTIONIST);
    }
}
