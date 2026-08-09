package com.eclinician.controllers;

import com.eclinician.domains.dtos.DispenseRequest;
import com.eclinician.domains.dtos.PrescriptionResponse;
import com.eclinician.domains.enums.PrescriptionStatus;
import com.eclinician.services.PharmacyService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/pharmacy/prescriptions")
public class PharmacyController {

    private final PharmacyService pharmacyService;
    public PharmacyController(PharmacyService pharmacyService) {
        this.pharmacyService = pharmacyService;
    }

    @GetMapping
    public List<PrescriptionResponse> listPrescriptions(@RequestHeader("X-Tenant-Id") String tenantId,
                                                        @RequestParam(required = false) PrescriptionStatus status) {
        return pharmacyService.list(tenantId, status);
    }

    @PostMapping("/{id}")
    public PrescriptionResponse update(@RequestHeader("X-Tenant-Id") String tenantId,
                                       @PathVariable UUID id, @Valid @RequestBody DispenseRequest request) {
        return pharmacyService.update(tenantId, id, request);
    }
}
