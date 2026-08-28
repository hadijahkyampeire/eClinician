package com.eclinician.controllers;

import com.eclinician.domains.dtos.request.AvailabilityRequest;
import com.eclinician.domains.dtos.response.AvailabilityResponse;
import com.eclinician.security.CurrentTenant;
import com.eclinician.services.ClinicianAvailabilityService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/clinician-availability")
@PreAuthorize("hasRole('CLINICIAN')")
public class ClinicianAvailabilityController {
    private final ClinicianAvailabilityService service;

    public ClinicianAvailabilityController(ClinicianAvailabilityService service) {
        this.service = service;
    }

    @GetMapping("/me")
    public List<AvailabilityResponse> getMine(
            @CurrentTenant String tenantId, Authentication authentication) {
        return service.getMine(tenantId, authentication.getName());
    }

    @PutMapping("/me")
    public List<AvailabilityResponse> replaceMine(@CurrentTenant String tenantId,
            Authentication authentication, @Valid @RequestBody AvailabilityRequest request) {
        return service.replaceMine(tenantId, authentication.getName(), request);
    }
}
