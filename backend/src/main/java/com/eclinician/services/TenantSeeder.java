package com.eclinician.services;

import com.eclinician.domains.entities.Tenant;
import com.eclinician.domains.enums.ClinicModule;
import com.eclinician.repositories.TenantRepository;
import java.util.List;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

/**
 * The demo clinic, with every module switched on. It runs before the other seeders so
 * their accounts and patients belong to a hospital that exists. The product is HK CLINIC;
 * this is one tenant on it, which is why the two names differ.
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
        tenant.setName("SWE Clinic");
        tenant.setPrimaryColor("#0f766e");
        tenant.setAddressLine("Plot 12, Kimathi Avenue");
        tenant.setCity("Kampala");
        tenant.setSubdivision("Kampala");
        tenant.setPostalCode("P.O. Box 7062");
        tenant.setCountry("UG");
        tenant.setPhone("+256700000000");
        tenant.setEmail("reception@sweclinic.test");
        tenant.setModuleList(List.of(ClinicModule.values()));
        tenants.save(tenant);
    }
}
