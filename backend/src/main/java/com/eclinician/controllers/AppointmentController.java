package com.eclinician.controllers;

import com.eclinician.domains.dtos.AppointmentRequest;
import com.eclinician.domains.dtos.AppointmentResponse;
import com.eclinician.services.AppointmentService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
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
            @RequestHeader("X-Tenant-Id") String tenantId,
            @RequestParam(required = false) UUID patientId) {
        return service.list(tenantId, patientId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public AppointmentResponse schedule(
            @RequestHeader("X-Tenant-Id") String tenantId,
            @Valid @RequestBody AppointmentRequest request) {
        return service.schedule(tenantId, request);
    }

    @PostMapping("/check-in")
    public AppointmentResponse checkIn(
            @RequestHeader("X-Tenant-Id") String tenantId,
            @Valid @RequestBody AppointmentRequest request) {
        return service.checkIn(tenantId, request);
    }

    @PostMapping("/{id}/waiting")
    public AppointmentResponse markWaiting(
            @RequestHeader("X-Tenant-Id") String tenantId,
            @PathVariable UUID id) {
        return service.markWaiting(tenantId, id);
    }

    @PostMapping("/patients/{patientId}/start-session")
    public AppointmentResponse startSession(
            @RequestHeader("X-Tenant-Id") String tenantId,
            @PathVariable UUID patientId) {
        return service.startSession(tenantId, patientId);
    }

    @PostMapping("/{id}/complete")
    public AppointmentResponse complete(
            @RequestHeader("X-Tenant-Id") String tenantId,
            @PathVariable UUID id) {
        return service.complete(tenantId, id);
    }
}
