package com.eclinician.controllers;

import com.eclinician.domains.dtos.CatalogResponse.LabTestOption;
import com.eclinician.domains.dtos.CatalogResponse.MedicationOption;
import com.eclinician.repositories.LabTestRepository;
import com.eclinician.repositories.MedicationRepository;
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * The reference lists behind the order forms: what medicines and tests exist.
 *
 * <p>No tenant scope and no patient data — these say what medicine *is*, not who was given
 * one. Every clinical role may read them: clinicians to order, the pharmacist to find an
 * equivalent when something is out of stock, the lab to know what a test name means.
 */
@RestController
@RequestMapping("/api/catalog")
@PreAuthorize("hasAnyRole('CLINICIAN', 'ADMINISTRATOR', 'PHARMACIST', 'LAB_TECHNICIAN')")
public class CatalogController {

    private final MedicationRepository medications;
    private final LabTestRepository labTests;

    public CatalogController(MedicationRepository medications, LabTestRepository labTests) {
        this.medications = medications;
        this.labTests = labTests;
    }

    @GetMapping("/medications")
    public List<MedicationOption> medications() {
        return medications.findByActiveTrueOrderByNameAsc().stream()
                .map(MedicationOption::from).toList();
    }

    @GetMapping("/lab-tests")
    public List<LabTestOption> labTests() {
        return labTests.findByActiveTrueOrderByNameAsc().stream()
                .map(LabTestOption::from).toList();
    }
}
