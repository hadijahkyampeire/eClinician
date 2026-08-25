package com.eclinician.services;

import com.eclinician.repositories.TenantRepository;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import org.springframework.stereotype.Component;

/**
 * What time it is at a hospital.
 *
 * <p>Every "today" and every rota hour in the app used to come from
 * {@code ZoneId.systemDefault()} — the server's clock, one value for the whole platform.
 * That is invisible while all the hospitals are in one country and wrong the moment they
 * are not: a rota says 08:00 meaning 08:00 *there*, and a dashboard's "today" starts at
 * midnight *there*. This is the one place that knows the difference.
 */
@Component
public class ClinicClock {

    private final TenantRepository tenants;

    public ClinicClock(TenantRepository tenants) {
        this.tenants = tenants;
    }

    /** The hospital's zone, or the server's if the tenant is somehow unknown. */
    public ZoneId zoneOf(String tenantId) {
        return tenants.findById(tenantId)
                .map(tenant -> tenant.zone())
                .orElseGet(ZoneId::systemDefault);
    }

    /** Midnight this morning, at that hospital. */
    public Instant startOfToday(String tenantId) {
        ZoneId zone = zoneOf(tenantId);
        return LocalDate.now(zone).atStartOfDay(zone).toInstant();
    }
}
