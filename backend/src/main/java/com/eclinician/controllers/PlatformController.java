package com.eclinician.controllers;

import com.eclinician.domains.dtos.PlatformStats;
import com.eclinician.domains.dtos.TenantRequest;
import com.eclinician.domains.dtos.TenantResponse;
import com.eclinician.services.TenantService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * The platform console. Every route belongs to the platform administrator, who has no
 * tenant and therefore cannot reach a single clinical endpoint in the system.
 */
@RestController
@RequestMapping("/api/platform")
@PreAuthorize("hasRole('PLATFORM_ADMIN')")
public class PlatformController {

    private final TenantService tenantService;

    public PlatformController(TenantService tenantService) {
        this.tenantService = tenantService;
    }

    @GetMapping("/stats")
    public PlatformStats stats() {
        return tenantService.stats();
    }

    @GetMapping("/hospitals")
    public List<TenantResponse> list() {
        return tenantService.list();
    }

    @PostMapping("/hospitals")
    @ResponseStatus(HttpStatus.CREATED)
    public TenantResponse create(@Valid @RequestBody TenantRequest request) {
        return tenantService.create(request);
    }

    @PutMapping("/hospitals/{id}")
    public TenantResponse update(@PathVariable String id,
            @Valid @RequestBody TenantRequest request) {
        return tenantService.update(id, request);
    }

    @PostMapping("/hospitals/{id}/active")
    public TenantResponse setActive(@PathVariable String id,
            @RequestBody ActiveRequest request) {
        return tenantService.setActive(id, request.active());
    }

    public record ActiveRequest(boolean active) {}
}
