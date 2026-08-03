package com.eclinician.encounter;

import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/encounters")
public class EncounterController {
    private final EncounterService service;

    EncounterController(EncounterService service) {
        this.service = service;
    }

    @GetMapping
    List<EncounterResponse> list(@RequestHeader("X-Tenant-Id") String tenantId,
            @RequestParam(required = false) UUID patientId) {
        return service.list(tenantId, patientId);
    }

    @GetMapping("/{id}")
    EncounterResponse get(@RequestHeader("X-Tenant-Id") String tenantId,
            @PathVariable UUID id) {
        return service.get(tenantId, id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    EncounterResponse create(@RequestHeader("X-Tenant-Id") String tenantId,
            @Valid @RequestBody EncounterRequest request) {
        return service.save(tenantId, null, request);
    }

    @PutMapping("/{id}")
    EncounterResponse update(@RequestHeader("X-Tenant-Id") String tenantId,
            @PathVariable UUID id, @Valid @RequestBody EncounterRequest request) {
        return service.save(tenantId, id, request);
    }

    @PostMapping("/{id}/finalize")
    EncounterResponse finalizeEncounter(@RequestHeader("X-Tenant-Id") String tenantId,
            @PathVariable UUID id) {
        return service.finalizeEncounter(tenantId, id);
    }
}
