package com.eclinician.controllers;

import com.eclinician.domains.dtos.response.DashboardStats;
import com.eclinician.security.CurrentTenant;
import com.eclinician.services.StatsService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.security.core.Authentication;

@RestController
@RequestMapping("/api/stats")
public class StatsController {

    private final StatsService service;

    public StatsController(StatsService service) {
        this.service = service;
    }

    @GetMapping("/dashboard")
    public DashboardStats dashboard(@CurrentTenant String tenantId, Authentication authentication) {
        boolean clinician = authentication.getAuthorities().stream()
                .anyMatch(authority -> authority.getAuthority().equals("ROLE_CLINICIAN"));
        return service.dashboard(tenantId, clinician ? authentication.getName() : null);
    }
}
