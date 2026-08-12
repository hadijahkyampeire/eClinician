package com.eclinician.controllers;

import com.eclinician.domains.dtos.LabOrderResponse;
import com.eclinician.domains.dtos.LabResultRequest;
import com.eclinician.domains.enums.LabStatus;
import com.eclinician.security.CurrentTenant;
import com.eclinician.services.LabService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/lab/orders")
public class LabController {

    private final LabService labService;
    public LabController(LabService labService) {
        this.labService = labService;
    }

    @GetMapping
    public List<LabOrderResponse> listOrders(@CurrentTenant String tenantId,
                                             @RequestParam(required = false) LabStatus status) {
        return labService.list(tenantId, status);
    }

    @PostMapping("/{id}")
    public LabOrderResponse update(@CurrentTenant String tenantId,
                                   @PathVariable UUID id, @Valid @RequestBody LabResultRequest request) {
        return labService.update(tenantId, id, request);
    }
}
