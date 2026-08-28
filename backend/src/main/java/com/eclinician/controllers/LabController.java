package com.eclinician.controllers;

import com.eclinician.domains.dtos.request.LabResultRequest;
import com.eclinician.domains.dtos.response.BenchPatient;
import com.eclinician.domains.dtos.response.LabOrderResponse;
import com.eclinician.domains.enums.LabStatus;
import com.eclinician.security.CurrentTenant;
import com.eclinician.security.CurrentUserName;
import com.eclinician.services.LabService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/lab")
public class LabController {

    private final LabService labService;
    public LabController(LabService labService) {
        this.labService = labService;
    }

    @PreAuthorize("hasAnyRole('LAB_TECHNICIAN', 'ADMINISTRATOR')")
    @GetMapping("/orders")
    public List<LabOrderResponse> listOrders(@CurrentTenant String tenantId,
                                             @RequestParam(required = false) LabStatus status) {
        return labService.list(tenantId, status);
    }

    @PreAuthorize("hasAnyRole('CLINICIAN', 'LAB_TECHNICIAN', 'ADMINISTRATOR')")
    @GetMapping("/orders/patients/{patientId}")
    public List<LabOrderResponse> listForPatient(@CurrentTenant String tenantId,
                                                 @PathVariable UUID patientId) {
        return labService.listForPatient(tenantId, patientId);
    }

    @PreAuthorize("hasRole('LAB_TECHNICIAN')")
    @PostMapping("/orders/{id}")
    public LabOrderResponse update(@CurrentTenant String tenantId,
                                   @CurrentUserName String technicianName,
                                   @PathVariable UUID id, @Valid @RequestBody LabResultRequest request) {
        return labService.update(tenantId, technicianName, id, request);
    }

    /** The queue as people rather than line items, longest wait first. */
    @PreAuthorize("hasAnyRole('LAB_TECHNICIAN', 'ADMINISTRATOR')")
    @GetMapping("/bench")
    public List<BenchPatient> bench(@CurrentTenant String tenantId) {
        return labService.bench(tenantId);
    }
}
