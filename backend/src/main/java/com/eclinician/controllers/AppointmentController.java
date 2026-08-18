package com.eclinician.controllers;

import com.eclinician.domains.dtos.AppointmentRequest;
import com.eclinician.domains.dtos.AppointmentResponse;
import com.eclinician.security.CurrentTenant;
import com.eclinician.services.AppointmentService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
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

    @GetMapping
    public List<AppointmentResponse> list(
            @CurrentTenant String tenantId,
            @RequestParam(required = false) UUID patientId) {
        return service.list(tenantId, patientId);
    }

    @PreAuthorize("hasAnyRole('RECEPTIONIST', 'ADMINISTRATOR')")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public AppointmentResponse schedule(
            @CurrentTenant String tenantId,
            @Valid @RequestBody AppointmentRequest request) {
        return service.schedule(tenantId, request);
    }

    @PreAuthorize("hasAnyRole('RECEPTIONIST', 'ADMINISTRATOR')")
    @PutMapping("/{id}")
    public AppointmentResponse update(
            @CurrentTenant String tenantId,
            @PathVariable UUID id,
            @Valid @RequestBody AppointmentRequest request) {
        return service.update(tenantId, id, request);
    }

    @PreAuthorize("hasAnyRole('RECEPTIONIST', 'ADMINISTRATOR')")
    @PostMapping("/{id}/cancel")
    public AppointmentResponse cancel(@CurrentTenant String tenantId, @PathVariable UUID id) {
        return service.cancel(tenantId, id);
    }

    @PreAuthorize("hasAnyRole('RECEPTIONIST', 'ADMINISTRATOR')")
    @PostMapping("/check-in")
    public AppointmentResponse checkIn(
            @CurrentTenant String tenantId,
            @Valid @RequestBody AppointmentRequest request) {
        return service.checkIn(tenantId, request);
    }

    @PreAuthorize("hasAnyRole('RECEPTIONIST', 'ADMINISTRATOR')")
    @PostMapping("/{id}/waiting")
    public AppointmentResponse markWaiting(
            @CurrentTenant String tenantId,
            @PathVariable UUID id) {
        return service.markWaiting(tenantId, id);
    }

    @PreAuthorize("hasAnyRole('CLINICIAN', 'ADMINISTRATOR')")
    @PostMapping("/patients/{patientId}/start-session")
    public AppointmentResponse startSession(
            @CurrentTenant String tenantId,
            @PathVariable UUID patientId) {
        return service.startSession(tenantId, patientId);
    }

    @PreAuthorize("hasAnyRole('CLINICIAN', 'ADMINISTRATOR')")
    @PostMapping("/{id}/complete")
    public AppointmentResponse complete(
            @CurrentTenant String tenantId,
            @PathVariable UUID id) {
        return service.complete(tenantId, id);
    }
}
