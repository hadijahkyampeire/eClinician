package com.eclinician;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.eclinician.domains.entities.Medication;
import com.eclinician.domains.enums.UserRole;
import com.eclinician.repositories.MedicationRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

/**
 * The order catalogue: reference data every clinical role may read, and nobody's patient
 * data. It is not tenant-scoped, so the thing worth pinning down is who can reach it and
 * that the label a clinician picks is composed in one place.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class OrderCatalogTests {

    @Autowired MockMvc mvc;
    @Autowired MedicationRepository medications;
    @Autowired TestAccounts accounts;

    @Test
    void theLabelIsComposedFromTheNameStrengthAndForm() {
        assertThat(medication("Amoxicillin", "500mg", "Capsule").label())
                .isEqualTo("Amoxicillin 500mg capsule");
        // A medicine with no single strength must not gain a stray space.
        assertThat(medication("Oral rehydration salts", null, "Sachet").label())
                .isEqualTo("Oral rehydration salts sachet");
        assertThat(medication("Something plain", null, null).label())
                .isEqualTo("Something plain");
    }

    @Test
    void everyClinicalRoleCanReadTheCatalogue() throws Exception {
        medications.save(medication("Artesunate", "60mg", "Injection"));

        // The pharmacist needs it to find an equivalent when something is out of stock.
        for (UserRole role : new UserRole[] {UserRole.CLINICIAN, UserRole.ADMINISTRATOR,
                UserRole.PHARMACIST, UserRole.LAB_TECHNICIAN}) {
            mvc.perform(get("/api/catalog/medications")
                            .header(HttpHeaders.AUTHORIZATION,
                                    accounts.bearerFor("catalog-hospital", role)))
                    .andExpect(status().isOk());
        }
    }

    @Test
    void theReceptionDeskHasNoBusinessOrderingMedicines() throws Exception {
        mvc.perform(get("/api/catalog/medications")
                        .header(HttpHeaders.AUTHORIZATION,
                                accounts.bearerFor("catalog-hospital", UserRole.RECEPTIONIST)))
                .andExpect(status().isForbidden());
    }

    /** Only what is active is offered — a withdrawn medicine stays for old records. */
    @Test
    void aWithdrawnMedicineIsNotOffered() throws Exception {
        Medication withdrawn = medication("Withdrawnamycin", "1g", "Tablet");
        withdrawn.setActive(false);
        medications.save(withdrawn);
        medications.save(medication("Keptamycin", "1g", "Tablet"));

        mvc.perform(get("/api/catalog/medications")
                        .header(HttpHeaders.AUTHORIZATION,
                                accounts.bearerFor("catalog-hospital", UserRole.CLINICIAN)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.name == 'Withdrawnamycin')]").isEmpty())
                .andExpect(jsonPath("$[?(@.name == 'Keptamycin')]").isNotEmpty());
    }

    private static Medication medication(String name, String strength, String form) {
        Medication value = new Medication();
        value.setName(name);
        value.setStrength(strength);
        value.setForm(form);
        value.setCategory("Test");
        return value;
    }
}
