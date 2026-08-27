package com.eclinician.controllers;

import com.eclinician.domains.dtos.request.DispenseRequest;
import com.eclinician.domains.dtos.response.CounterPatient;
import com.eclinician.domains.dtos.response.PrescriptionResponse;
import com.eclinician.domains.enums.PrescriptionStatus;
import com.eclinician.security.CurrentTenant;
import com.eclinician.security.CurrentUserName;
import com.eclinician.services.PharmacyService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/pharmacy")
public class PharmacyController {

    private final PharmacyService pharmacyService;
    public PharmacyController(PharmacyService pharmacyService) {
        this.pharmacyService = pharmacyService;
    }

    @PreAuthorize("hasAnyRole('PHARMACIST', 'ADMINISTRATOR')")
    @GetMapping("/prescriptions")
    public List<PrescriptionResponse> listPrescriptions(@CurrentTenant String tenantId,
                                                        @RequestParam(required = false) PrescriptionStatus status) {
        return pharmacyService.list(tenantId, status);
    }

    @PreAuthorize("hasAnyRole('CLINICIAN', 'PHARMACIST', 'ADMINISTRATOR')")
    @GetMapping("/prescriptions/patients/{patientId}")
    public List<PrescriptionResponse> listForPatient(@CurrentTenant String tenantId,
                                                     @PathVariable UUID patientId) {
        return pharmacyService.listForPatient(tenantId, patientId);
    }

    @PreAuthorize("hasRole('PHARMACIST')")
    @PostMapping("/prescriptions/{id}")
    public PrescriptionResponse update(@CurrentTenant String tenantId,
                                       @CurrentUserName String pharmacistName,
                                       @PathVariable UUID id, @Valid @RequestBody DispenseRequest request) {
        return pharmacyService.update(tenantId, pharmacistName, id, request);
    }

    /**
     * What the pharmacy could not supply, for patients still in the building. The clinician
     * reads this to prescribe something else while there is still time to.
     */
    @PreAuthorize("hasAnyRole('CLINICIAN', 'PHARMACIST', 'ADMINISTRATOR')")
    @GetMapping("/unsupplied")
    public List<PrescriptionResponse> unsupplied(@CurrentTenant String tenantId) {
        return pharmacyService.unsupplied(tenantId);
    }

    /** Who is standing at the counter, and what each of them is waiting for. */
    @PreAuthorize("hasAnyRole('PHARMACIST', 'ADMINISTRATOR')")
    @GetMapping("/counter")
    public List<CounterPatient> atTheCounter(@CurrentTenant String tenantId) {
        return pharmacyService.atTheCounter(tenantId);
    }

    /**
     * They have their medicines and gone. The last thing open on them closes here — and
     * only the counter closes it, the same rule dispensing already follows: the pharmacy
     * is the last stop, so the pharmacy is what says the visit is over.
     */
    @PreAuthorize("hasRole('PHARMACIST')")
    @PostMapping("/counter/{patientId}/check-out")
    public void checkOut(@CurrentTenant String tenantId, @PathVariable UUID patientId) {
        pharmacyService.checkOut(tenantId, patientId);
    }
}
