package com.eclinician.controllers;

import com.eclinician.domains.dtos.EncounterRequest;
import com.eclinician.domains.dtos.EncounterResponse;
import com.eclinician.security.CurrentTenant;
import com.eclinician.security.CurrentUserName;
import com.eclinician.services.EncounterService;
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
@RequestMapping("/api/encounters")
public class EncounterController {
    private final EncounterService service;

    public EncounterController(EncounterService service) {
        this.service = service;
    }

    @GetMapping
    public List<EncounterResponse> list(@CurrentTenant String tenantId,
            @RequestParam(required = false) UUID patientId) {
        return service.list(tenantId, patientId);
    }

    @GetMapping("/{id}")
    public EncounterResponse get(@CurrentTenant String tenantId,
            @PathVariable UUID id) {
        return service.get(tenantId, id);
    }

    @PreAuthorize("hasAnyRole('CLINICIAN', 'ADMINISTRATOR')")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public EncounterResponse create(@CurrentTenant String tenantId,
            @CurrentUserName String clinicianName,
            @Valid @RequestBody EncounterRequest request) {
        return service.save(tenantId, clinicianName, null, request);
    }

    @PreAuthorize("hasAnyRole('CLINICIAN', 'ADMINISTRATOR')")
    @PutMapping("/{id}")
    public EncounterResponse update(@CurrentTenant String tenantId,
            @CurrentUserName String clinicianName,
            @PathVariable UUID id, @Valid @RequestBody EncounterRequest request) {
        return service.save(tenantId, clinicianName, id, request);
    }

    @PreAuthorize("hasAnyRole('CLINICIAN', 'ADMINISTRATOR')")
    @PostMapping("/{id}/finalize")
    public EncounterResponse finalizeEncounter(@CurrentTenant String tenantId,
            @PathVariable UUID id) {
        return service.finalizeEncounter(tenantId, id);
    }
}
