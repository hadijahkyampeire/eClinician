package com.eclinician.services;

import com.eclinician.domains.entities.Tenant;
import com.eclinician.domains.enums.ClinicModule;
import com.eclinician.repositories.TenantRepository;
import java.util.List;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

/**
 * The demo hospital, with every module switched on. It runs before the other seeders so
 * their accounts and patients belong to a hospital that exists.
 */
@Component
@Order(1)
public class TenantSeeder implements CommandLineRunner {

    static final String TENANT = "hk-clinics";

    private final TenantRepository tenants;

    public TenantSeeder(TenantRepository tenants) {
        this.tenants = tenants;
    }

    @Override
    public void run(String... args) {
        if (tenants.existsById(TENANT)) return;
        Tenant tenant = new Tenant();
        tenant.setId(TENANT);
        tenant.setName("HK Clinics");
        tenant.setPrimaryColor("#0f766e");
        tenant.setModuleList(List.of(ClinicModule.values()));
        tenants.save(tenant);
    }
}
