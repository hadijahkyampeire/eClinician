package com.eclinician.controllers;

import com.eclinician.domains.dtos.AppointmentRequest;
import com.eclinician.domains.dtos.AppointmentResponse;
import com.eclinician.security.CurrentTenant;
import com.eclinician.services.AppointmentService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.security.core.Authentication;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/appointments")
public class AppointmentController {

    private final AppointmentService service;

    public AppointmentController(AppointmentService service) {
        this.service = service;
    }

    @PreAuthorize("hasAnyRole('RECEPTIONIST', 'CLINICIAN', 'ADMINISTRATOR')")
    @GetMapping
    public List<AppointmentResponse> list(
            @CurrentTenant String tenantId,
            @RequestParam(required = false) UUID patientId,
            Authentication authentication) {
        boolean clinician = authentication.getAuthorities().stream()
                .anyMatch(authority -> authority.getAuthority().equals("ROLE_CLINICIAN"));
        return service.list(tenantId, patientId,
                clinician ? authentication.getName() : null);
    }

    @PreAuthorize("hasRole('RECEPTIONIST')")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public AppointmentResponse schedule(
            @CurrentTenant String tenantId,
            @Valid @RequestBody AppointmentRequest request) {
        return service.schedule(tenantId, request);
    }

    @PreAuthorize("hasRole('RECEPTIONIST')")
    @PutMapping("/{id}")
    public AppointmentResponse update(
            @CurrentTenant String tenantId,
            @PathVariable UUID id,
            @Valid @RequestBody AppointmentRequest request) {
        return service.update(tenantId, id, request);
    }

    @PreAuthorize("hasRole('RECEPTIONIST')")
    @PostMapping("/{id}/cancel")
    public AppointmentResponse cancel(@CurrentTenant String tenantId, @PathVariable UUID id) {
        return service.cancel(tenantId, id);
    }

    @PreAuthorize("hasRole('RECEPTIONIST')")
    @PostMapping("/check-in")
    public AppointmentResponse checkIn(
            @CurrentTenant String tenantId,
            @Valid @RequestBody AppointmentRequest request) {
        return service.checkIn(tenantId, request);
    }

    /** The desk decides who cannot wait their turn, before or after they have sat down. */
    @PreAuthorize("hasAnyRole('RECEPTIONIST', 'ADMINISTRATOR')")
    @PostMapping("/{id}/urgency")
    public AppointmentResponse setUrgent(
            @CurrentTenant String tenantId,
            @PathVariable UUID id,
            @RequestParam boolean urgent) {
        return service.setUrgent(tenantId, id, urgent);
    }

    @PreAuthorize("hasRole('RECEPTIONIST')")
    @PostMapping("/{id}/waiting")
    public AppointmentResponse markWaiting(
            @CurrentTenant String tenantId,
            @PathVariable UUID id) {
        return service.markWaiting(tenantId, id);
    }

    @PreAuthorize("hasRole('CLINICIAN')")
    @PostMapping("/patients/{patientId}/start-session")
    public AppointmentResponse startSession(
            @CurrentTenant String tenantId,
            @PathVariable UUID patientId,
            Authentication authentication) {
        return service.startSession(tenantId, patientId, authentication.getName());
    }

    @PreAuthorize("hasRole('CLINICIAN')")
    @PostMapping("/{id}/complete")
    public AppointmentResponse complete(
            @CurrentTenant String tenantId,
            @PathVariable UUID id) {
        return service.complete(tenantId, id);
    }
}
