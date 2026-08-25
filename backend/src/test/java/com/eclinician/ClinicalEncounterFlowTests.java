package com.eclinician;

import com.eclinician.domains.entities.Patient;
import com.eclinician.domains.enums.UserRole;
import com.eclinician.domains.enums.PatientCareStatus;
import com.eclinician.repositories.PatientRepository;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDate;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class ClinicalEncounterFlowTests {
    private static final String TENANT = "end-to-end-hospital";

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;
    @Autowired PatientRepository patients;
    @Autowired TestAccounts accounts;

    @Test
    void clinicianCanMovePatientFromCheckInThroughAVisibleFinalizedRecord() throws Exception {
        Patient patient = patient();
        // The tenant is never sent — it rides inside each token. One token per role,
        // because the server now enforces who may do what.
        String reception = accounts.bearerFor(TENANT, UserRole.RECEPTIONIST);
        String clinician = accounts.bearerFor(TENANT, UserRole.CLINICIAN);
        String labTech = accounts.bearerFor(TENANT, UserRole.LAB_TECHNICIAN);
        String pharmacist = accounts.bearerFor(TENANT, UserRole.PHARMACIST);

        String checkedInBody = mvc.perform(post("/api/appointments/check-in")
                        .header("Authorization", reception)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"patientId\":\"" + patient.getId() + "\",\"reason\":\"Fever\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CHECKED_IN"))
                .andReturn().getResponse().getContentAsString();
        String appointmentId = mapper.readTree(checkedInBody).get("id").asText();

        mvc.perform(post("/api/appointments/{id}/waiting", appointmentId)
                        .header("Authorization", reception))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("WAITING"))
                .andExpect(jsonPath("$.waitingAt").isNotEmpty());

        // A clinician sees both reception arrivals and waiting-room patients.
        mvc.perform(get("/api/appointments")
                        .header("Authorization", clinician))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(appointmentId))
                .andExpect(jsonPath("$[0].status").value("WAITING"));

        mvc.perform(post("/api/appointments/patients/{patientId}/start-session", patient.getId())
                        .header("Authorization", clinician))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("IN_SESSION"));

        String encounterJson = mapper.writeValueAsString(mapper.createObjectNode()
                .put("patientId", patient.getId().toString())
                .put("appointmentId", appointmentId)
                .put("chiefComplaint", "Fever and chills")
                .put("bloodPressure", "120/80")
                .put("temperatureCelsius", 38.1)
                .put("pulseBpm", 88)
                .put("weightKg", 62.5)
                .put("symptoms", "Fever for two days")
                .put("examinationNotes", "Alert and hydrated")
                .put("diagnosis", "Uncomplicated malaria")
                .put("treatmentPlan", "Begin antimalarial treatment")
                .put("prescriptions", "Artemether/lumefantrine")
                .put("labRequests", "Malaria rapid diagnostic test"));

        String draftBody = mvc.perform(post("/api/encounters")
                        .header("Authorization", clinician)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(encounterJson))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("DRAFT"))
                .andReturn().getResponse().getContentAsString();
        JsonNode draft = mapper.readTree(draftBody);

        mvc.perform(post("/api/encounters/{id}/finalize", draft.get("id").asText())
                        .header("Authorization", clinician))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("FINALIZED"))
                .andExpect(jsonPath("$.diagnosis").value("Uncomplicated malaria"));

        org.assertj.core.api.Assertions.assertThat(
                patients.findById(patient.getId()).orElseThrow().getActiveCareStatus())
                .isEqualTo(PatientCareStatus.PHARMACY);

        String prescriptionBody = mvc.perform(get("/api/pharmacy/prescriptions")
                        .header("Authorization", pharmacist)
                        .queryParam("status", "PENDING"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].medication").value("Artemether/lumefantrine"))
                .andReturn().getResponse().getContentAsString();

        mvc.perform(post("/api/pharmacy/prescriptions/{id}",
                        mapper.readTree(prescriptionBody).get(0).get("id").asText())
                        .header("Authorization", pharmacist)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"DISPENSED\",\"quantityDispensed\":24,"
                                + "\"dispenseUnit\":\"tablets\",\"notes\":\"\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("DISPENSED"))
                // Dispensed as prescribed, and the amount that left the shelf.
                .andExpect(jsonPath("$.dispensedMedication").value("Artemether/lumefantrine"))
                .andExpect(jsonPath("$.substituted").value(false))
                .andExpect(jsonPath("$.quantityDispensed").value(24));

        org.assertj.core.api.Assertions.assertThat(
                patients.findById(patient.getId()).orElseThrow().getActiveCareStatus())
                .isNull();

        mvc.perform(get("/api/encounters")
                        .header("Authorization", clinician)
                        .queryParam("patientId", patient.getId().toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].patientName").value("E2E Patient"))
                .andExpect(jsonPath("$[0].status").value("FINALIZED"));

        mvc.perform(get("/api/appointments")
                        .header("Authorization", clinician)
                        .queryParam("patientId", patient.getId().toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].status").value("COMPLETED"));

        // Finalizing raised the lab request as a PENDING order the technician can result.
        String queueBody = mvc.perform(get("/api/lab/orders")
                        .header("Authorization", labTech)
                        .queryParam("status", "PENDING"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].testName").value("Malaria rapid diagnostic test"))
                .andExpect(jsonPath("$[0].patientName").value("E2E Patient"))
                .andReturn().getResponse().getContentAsString();

        mvc.perform(post("/api/lab/orders/{id}", mapper.readTree(queueBody).get(0).get("id").asText())
                        .header("Authorization", labTech)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"COMPLETED\",\"result\":\"Positive for P. falciparum\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("COMPLETED"))
                // stamped from the technician's token, not from the request body
                .andExpect(jsonPath("$.resultedBy").value(TestAccounts.nameFor(UserRole.LAB_TECHNICIAN)));
    }

    private Patient patient() {
        Patient patient = new Patient();
        patient.setTenantId(TENANT);
        patient.setFirstName("E2E");
        patient.setLastName("Patient");
        patient.setDateOfBirth(LocalDate.of(1992, 4, 10));
        patient.setSex("Female");
        patient.setPhone("+256700000003");
        return patients.save(patient);
    }
}
