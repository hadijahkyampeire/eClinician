package com.eclinician.stats;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/stats")
public class StatsController {

    private final StatsService service;

    StatsController(StatsService service) {
        this.service = service;
    }

    @GetMapping("/dashboard")
    DashboardStats dashboard(@RequestHeader("X-Tenant-Id") String tenantId) {
        return service.dashboard(tenantId);
    }
}
