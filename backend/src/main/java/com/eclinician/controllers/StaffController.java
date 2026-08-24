package com.eclinician.controllers;

import com.eclinician.domains.dtos.StaffRequest;
import com.eclinician.domains.dtos.StaffResponse;
import com.eclinician.security.CurrentTenant;
import com.eclinician.services.StaffService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import java.time.Instant;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** Staff accounts. The whole module is the administrator's, hence the class-level rule. */
@RestController
@RequestMapping("/api/staff")
@PreAuthorize("hasRole('ADMINISTRATOR')")
public class StaffController {

    private final StaffService staffService;

    public StaffController(StaffService staffService) {
        this.staffService = staffService;
    }

    @GetMapping
    public List<StaffResponse> list(@CurrentTenant String tenantId) {
        return staffService.list(tenantId);
    }

    /** Receptionists book appointments, so they may read the clinician list — and only that. */
    @PreAuthorize("hasAnyRole('RECEPTIONIST', 'CLINICIAN', 'ADMINISTRATOR')")
    @GetMapping("/clinicians")
    public List<StaffResponse> clinicians(@CurrentTenant String tenantId,
            @RequestParam(required = false) Instant availableAt) {
        return staffService.clinicians(tenantId, availableAt);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public StaffResponse create(@CurrentTenant String tenantId,
            @Valid @RequestBody StaffRequest request) {
        return staffService.create(tenantId, request);
    }

    @PutMapping("/{id}")
    public StaffResponse update(@CurrentTenant String tenantId, @PathVariable UUID id,
            @Valid @RequestBody StaffRequest request) {
        return staffService.update(tenantId, id, request);
    }

    /** Deactivate or restore. The subject of the token is the caller's own email. */
    @PostMapping("/{id}/active")
    public StaffResponse setActive(@CurrentTenant String tenantId, @PathVariable UUID id,
            @RequestBody ActiveRequest request, @AuthenticationPrincipal Jwt caller) {
        return staffService.setActive(tenantId, id, request.active(), caller.getSubject());
    }

    public record ActiveRequest(boolean active) {}
}
