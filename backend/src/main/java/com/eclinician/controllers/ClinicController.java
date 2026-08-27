package com.eclinician.controllers;

import com.eclinician.domains.dtos.request.ClinicSettingsRequest;
import com.eclinician.domains.dtos.response.TenantResponse;
import com.eclinician.security.CurrentTenant;
import com.eclinician.services.TenantService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * A hospital's own settings. The tenant comes from the token, so an administrator can
 * only ever reach their own clinic — there is no id in the path to change.
 */
@RestController
@RequestMapping("/api/clinic")
public class ClinicController {

    private final TenantService tenantService;

    public ClinicController(TenantService tenantService) {
        this.tenantService = tenantService;
    }

    /** Any signed-in member of staff may read their clinic's branding. */
    @GetMapping
    public TenantResponse clinic(@CurrentTenant String tenantId) {
        return tenantService.read(tenantId);
    }

    @PreAuthorize("hasRole('ADMINISTRATOR')")
    @PutMapping
    public TenantResponse update(@CurrentTenant String tenantId,
            @Valid @RequestBody ClinicSettingsRequest request) {
        return tenantService.updateSettings(tenantId, request);
    }
}
