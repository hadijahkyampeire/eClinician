package com.eclinician.controllers;

import com.eclinician.domains.dtos.PatientRequest;
import com.eclinician.domains.dtos.PatientResponse;
import com.eclinician.security.CurrentTenant;
import com.eclinician.services.PatientService;
import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.format.annotation.DateTimeFormat;

@RestController
@RequestMapping("/api/patients")
public class PatientController {

    private final PatientService service;

    public PatientController(PatientService service) {
        this.service = service;
    }

    @GetMapping
    public Page<PatientResponse> list(@CurrentTenant String tenantId,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String sex,
            @RequestParam(required = false) String country,
            @RequestParam(required = false) String careStatus,
            @RequestParam(required = false) String nationalId,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dobFrom,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dobTo,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate enrolledFrom,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate enrolledTo,
            @PageableDefault(sort = "createdAt", direction = Sort.Direction.DESC)
            Pageable pageable) {
        return service.list(tenantId, q, sex, country, careStatus, nationalId, dobFrom, dobTo,
                enrolledFrom, enrolledTo, pageable);
    }

    @GetMapping("/{id}")
    public PatientResponse get(@CurrentTenant String tenantId, @PathVariable UUID id) {
        return service.get(tenantId, id);
    }

    @PreAuthorize("hasAnyRole('RECEPTIONIST', 'ADMINISTRATOR')")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PatientResponse create(@CurrentTenant String tenantId,
            @Valid @RequestBody PatientRequest req) {
        return service.create(tenantId, req);
    }

    @PreAuthorize("hasAnyRole('RECEPTIONIST', 'ADMINISTRATOR')")
    @PutMapping("/{id}")
    public PatientResponse update(@CurrentTenant String tenantId,
            @PathVariable UUID id, @Valid @RequestBody PatientRequest req) {
        return service.update(tenantId, id, req);
    }

    @PreAuthorize("hasAnyRole('RECEPTIONIST', 'ADMINISTRATOR')")
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@CurrentTenant String tenantId, @PathVariable UUID id) {
        service.delete(tenantId, id);
    }
}
