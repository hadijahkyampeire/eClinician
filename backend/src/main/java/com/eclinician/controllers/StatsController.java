package com.eclinician.controllers;

import com.eclinician.domains.dtos.DashboardStats;
import com.eclinician.security.CurrentTenant;
import com.eclinician.services.StatsService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/stats")
public class StatsController {

    private final StatsService service;

    public StatsController(StatsService service) {
        this.service = service;
    }

    @GetMapping("/dashboard")
    public DashboardStats dashboard(@CurrentTenant String tenantId) {
        return service.dashboard(tenantId);
    }
}
