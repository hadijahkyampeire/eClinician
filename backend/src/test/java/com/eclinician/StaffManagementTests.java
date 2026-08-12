package com.eclinician;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.eclinician.domains.enums.UserRole;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

/** SRS use case 6 — an administrator manages the staff of their own clinic. */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class StaffManagementTests {

    private static final String TENANT = "staff-hospital";

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;
    @Autowired TestAccounts accounts;

    @Test
    void anAdministratorAddsAnAccountThatCanThenSignIn() throws Exception {
        String created = mvc.perform(post("/api/staff")
                        .header("Authorization", admin())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(staff("Nurse Joy", "joy@staff-hospital.com", "PHARMACIST")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.roleLabel").value("Pharmacist"))
                .andExpect(jsonPath("$.active").value(true))
                .andReturn().getResponse().getContentAsString();

        mvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"joy@staff-hospital.com\",\"password\":\"secret-password\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tenantId").value(TENANT));

        // Deactivated, the same credentials stop working.
        String id = mapper.readTree(created).get("id").asText();
        mvc.perform(post("/api/staff/{id}/active", id)
                        .header("Authorization", admin())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"active\":false}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.active").value(false));

        mvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"joy@staff-hospital.com\",\"password\":\"secret-password\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void anEmailCanOnlyBeUsedOnce() throws Exception {
        mvc.perform(post("/api/staff").header("Authorization", admin())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(staff("First", "shared@staff-hospital.com", "CLINICIAN")))
                .andExpect(status().isCreated());

        mvc.perform(post("/api/staff").header("Authorization", admin())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(staff("Second", "shared@staff-hospital.com", "RECEPTIONIST")))
                .andExpect(status().isConflict());
    }

    @Test
    void onlyAnAdministratorMayManageStaff() throws Exception {
        mvc.perform(get("/api/staff")
                        .header("Authorization", accounts.bearerFor(TENANT, UserRole.CLINICIAN)))
                .andExpect(status().isForbidden());

        mvc.perform(post("/api/staff")
                        .header("Authorization", accounts.bearerFor(TENANT, UserRole.RECEPTIONIST))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(staff("Sneaky", "sneaky@staff-hospital.com", "ADMINISTRATOR")))
                .andExpect(status().isForbidden());
    }

    @Test
    void anAdministratorCannotLockThemselvesOut() throws Exception {
        String listed = mvc.perform(get("/api/staff").header("Authorization", admin()))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        String ownId = mapper.readTree(listed).get(0).get("id").asText();

        mvc.perform(post("/api/staff/{id}/active", ownId)
                        .header("Authorization", admin())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"active\":false}"))
                .andExpect(status().isConflict());
    }

    private String admin() {
        return accounts.bearerFor(TENANT, UserRole.ADMINISTRATOR);
    }

    private String staff(String name, String email, String role) {
        return "{\"name\":\"" + name + "\",\"email\":\"" + email + "\",\"role\":\"" + role
                + "\",\"password\":\"secret-password\"}";
    }
}
