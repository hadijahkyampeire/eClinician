package com.eclinician.controllers;

import com.eclinician.domains.dtos.request.ActiveRequest;
import com.eclinician.domains.dtos.request.TenantRequest;
import com.eclinician.domains.dtos.response.HospitalFilterOptions;
import com.eclinician.domains.dtos.response.PlatformPatientRow;
import com.eclinician.domains.dtos.response.PlatformStaffRow;
import com.eclinician.domains.dtos.response.PlatformStats;
import com.eclinician.domains.dtos.response.TenantResponse;
import com.eclinician.services.PlatformDirectoryService;
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
import org.springframework.web.bind.annotation.RequestParam;
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
    private final PlatformDirectoryService directory;

    public PlatformController(TenantService tenantService, PlatformDirectoryService directory) {
        this.tenantService = tenantService;
        this.directory = directory;
    }

    @GetMapping("/stats")
    public PlatformStats stats() {
        return tenantService.stats();
    }

    /** All three filters are optional; absent means "do not narrow on this". */
    @GetMapping("/hospitals")
    public List<TenantResponse> list(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String country,
            @RequestParam(required = false) String subdivision) {
        return tenantService.list(search, country, subdivision);
    }

    /** What the two location filters may offer, given the country already chosen. */
    @GetMapping("/hospitals/locations")
    public HospitalFilterOptions locations(@RequestParam(required = false) String country) {
        return tenantService.filterOptions(country);
    }

    /** Read-only: who works at each hospital. The platform never edits these accounts. */
    @GetMapping("/staff")
    public List<PlatformStaffRow> staff() {
        return directory.staff();
    }

    /** Read-only and de-identified: how many patients each hospital carries, not who. */
    @GetMapping("/patients")
    public List<PlatformPatientRow> patients() {
        return directory.patients();
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
}
