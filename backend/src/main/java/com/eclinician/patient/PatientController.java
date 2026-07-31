package com.eclinician.patient;

import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
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
import org.springframework.format.annotation.DateTimeFormat;

@RestController
@RequestMapping("/api/patients")
public class PatientController {

    private final PatientService service;

    PatientController(PatientService service) {
        this.service = service;
    }

    @GetMapping
    Page<PatientResponse> list(@RequestHeader("X-Tenant-Id") String tenantId,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String sex,
            @RequestParam(required = false) String country,
            @RequestParam(required = false) String careStatus,
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
        return service.list(tenantId, q, sex, country, careStatus, dobFrom, dobTo,
                enrolledFrom, enrolledTo, pageable);
    }

    @GetMapping("/{id}")
    PatientResponse get(@RequestHeader("X-Tenant-Id") String tenantId, @PathVariable UUID id) {
        return service.get(tenantId, id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    PatientResponse create(@RequestHeader("X-Tenant-Id") String tenantId,
            @Valid @RequestBody PatientRequest req) {
        return service.create(tenantId, req);
    }

    @PutMapping("/{id}")
    PatientResponse update(@RequestHeader("X-Tenant-Id") String tenantId,
            @PathVariable UUID id, @Valid @RequestBody PatientRequest req) {
        return service.update(tenantId, id, req);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void delete(@RequestHeader("X-Tenant-Id") String tenantId, @PathVariable UUID id) {
        service.delete(tenantId, id);
    }
}
