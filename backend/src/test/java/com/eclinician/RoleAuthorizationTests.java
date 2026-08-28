package com.eclinician;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.eclinician.domains.dtos.request.TenantRequest;
import com.eclinician.domains.enums.ClinicModule;
import com.eclinician.domains.enums.UserRole;
import com.eclinician.services.TenantService;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

/**
 * Authentication says who you are; these say what that lets you do. Hiding a button in
 * the UI is not security — the server has to refuse, which is what is asserted here.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class RoleAuthorizationTests {

    private static final String TENANT = "roles-hospital";

    @Autowired MockMvc mvc;
    @Autowired TenantService tenants;
    @Autowired TestAccounts accounts;

    @Test
    void aReceptionistCannotDispenseMedication() throws Exception {
        mvc.perform(post("/api/pharmacy/prescriptions/{id}", UUID.randomUUID())
                        .header("Authorization", accounts.bearerFor(TENANT, UserRole.RECEPTIONIST))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"DISPENSED\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void aReceptionistCannotEvenSeeThePharmacyQueue() throws Exception {
        mvc.perform(get("/api/pharmacy/prescriptions")
                        .header("Authorization", accounts.bearerFor(TENANT, UserRole.RECEPTIONIST)))
                .andExpect(status().isForbidden());
    }

    @Test
    void aPharmacistCannotTakeAPatientIntoSession() throws Exception {
        mvc.perform(post("/api/appointments/patients/{id}/start-session", UUID.randomUUID())
                        .header("Authorization", accounts.bearerFor(TENANT, UserRole.PHARMACIST)))
                .andExpect(status().isForbidden());
    }

    @Test
    void aPharmacistCannotRegisterAPatient() throws Exception {
        mvc.perform(post("/api/patients")
                        .header("Authorization", accounts.bearerFor(TENANT, UserRole.PHARMACIST))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"firstName\":\"Walk\",\"lastName\":\"In\",\"dateOfBirth\":\"1990-01-01\","
                                + "\"sex\":\"Female\",\"phone\":\"+256700000011\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void aLabTechnicianCannotWorkThePharmacyQueueAndViceVersa() throws Exception {
        mvc.perform(get("/api/lab/orders")
                        .header("Authorization", accounts.bearerFor(TENANT, UserRole.PHARMACIST)))
                .andExpect(status().isForbidden());

        mvc.perform(get("/api/pharmacy/prescriptions")
                        .header("Authorization", accounts.bearerFor(TENANT, UserRole.LAB_TECHNICIAN)))
                .andExpect(status().isForbidden());
    }

    @Test
    void theRightRoleIsAllowedThrough() throws Exception {
        mvc.perform(get("/api/pharmacy/prescriptions")
                        .header("Authorization", accounts.bearerFor(TENANT, UserRole.PHARMACIST)))
                .andExpect(status().isOk());

        mvc.perform(get("/api/lab/orders")
                        .header("Authorization", accounts.bearerFor(TENANT, UserRole.LAB_TECHNICIAN)))
                .andExpect(status().isOk());
    }

    @Test
    void anAdministratorMayWatchEveryDepartment() throws Exception {
        String admin = accounts.bearerFor(TENANT, UserRole.ADMINISTRATOR);

        mvc.perform(get("/api/pharmacy/prescriptions").header("Authorization", admin))
                .andExpect(status().isOk());
        mvc.perform(get("/api/lab/orders").header("Authorization", admin))
                .andExpect(status().isOk());
        mvc.perform(get("/api/patients").header("Authorization", admin))
                .andExpect(status().isOk());
    }

    /** Oversight is not the same as authority: the administrator changes no clinical row. */
    @Test
    void anAdministratorMayNotDoTheClinicalWork() throws Exception {
        String admin = accounts.bearerFor(TENANT, UserRole.ADMINISTRATOR);

        mvc.perform(post("/api/patients").header("Authorization", admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"firstName\":\"A\",\"lastName\":\"B\",\"dateOfBirth\":\"1990-01-01\","
                                + "\"sex\":\"Other\",\"phone\":\"+256700000123\"}"))
                .andExpect(status().isForbidden());

        mvc.perform(post("/api/pharmacy/prescriptions/{id}", UUID.randomUUID())
                        .header("Authorization", admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"DISPENSED\",\"notes\":\"\"}"))
                .andExpect(status().isForbidden());

        mvc.perform(post("/api/lab/orders/{id}", UUID.randomUUID())
                        .header("Authorization", admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"COMPLETED\",\"result\":\"Negative\",\"notes\":\"\"}"))
                .andExpect(status().isForbidden());

        mvc.perform(post("/api/encounters").header("Authorization", admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"patientId\":\"" + UUID.randomUUID() + "\",\"appointmentId\":\""
                                + UUID.randomUUID() + "\"}"))
                .andExpect(status().isForbidden());
    }

    /** Their own clinic's branding, on the other hand, is exactly their job. */
    @Test
    void anAdministratorOwnsTheirClinicSettings() throws Exception {
        tenants.create(new TenantRequest(TENANT, "Authorization Hospital", "#0f766e",
                List.of(ClinicModule.values())));

        mvc.perform(put("/api/clinic")
                        .header("Authorization", accounts.bearerFor(TENANT, UserRole.ADMINISTRATOR))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Renamed Clinic\",\"primaryColor\":\"#123456\"}"))
                .andExpect(status().isOk());

        mvc.perform(put("/api/clinic")
                        .header("Authorization", accounts.bearerFor(TENANT, UserRole.RECEPTIONIST))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Not mine\",\"primaryColor\":\"#123456\"}"))
                .andExpect(status().isForbidden());
    }
}
