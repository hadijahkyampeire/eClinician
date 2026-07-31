package com.eclinician.appointment;

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

    AppointmentController(AppointmentService service) {
        this.service = service;
    }

    @GetMapping
    List<AppointmentResponse> list(
            @RequestHeader("X-Tenant-Id") String tenantId,
            @RequestParam(required = false) UUID patientId) {
        return service.list(tenantId, patientId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    AppointmentResponse schedule(
            @RequestHeader("X-Tenant-Id") String tenantId,
            @Valid @RequestBody AppointmentRequest request) {
        return service.schedule(tenantId, request);
    }

    @PostMapping("/check-in")
    AppointmentResponse checkIn(
            @RequestHeader("X-Tenant-Id") String tenantId,
            @Valid @RequestBody AppointmentRequest request) {
        return service.checkIn(tenantId, request);
    }

    @PostMapping("/{id}/waiting")
    AppointmentResponse markWaiting(
            @RequestHeader("X-Tenant-Id") String tenantId,
            @PathVariable UUID id) {
        return service.markWaiting(tenantId, id);
    }

    @PostMapping("/patients/{patientId}/start-session")
    AppointmentResponse startSession(
            @RequestHeader("X-Tenant-Id") String tenantId,
            @PathVariable UUID patientId) {
        return service.startSession(tenantId, patientId);
    }

    @PostMapping("/{id}/complete")
    AppointmentResponse complete(
            @RequestHeader("X-Tenant-Id") String tenantId,
            @PathVariable UUID id) {
        return service.complete(tenantId, id);
    }
}
