package com.eclinician.domains.dtos;

import com.eclinician.domains.entities.Tenant;
import java.time.Instant;
import java.util.List;

/** A hospital as the platform console and the login response see it. */
public record TenantResponse(
        String id,
        String name,
        String primaryColor,
        List<String> enabledModules,
        boolean active,
        Instant createdAt,
        String addressLine,
        String city,
        String subdivision,
        String postalCode,
        String country,
        String phone,
        String email) {

    public static TenantResponse from(Tenant tenant) {
        return new TenantResponse(tenant.getId(), tenant.getName(), tenant.getPrimaryColor(),
                tenant.moduleList().stream().map(module -> module.key()).toList(),
                tenant.isActive(), tenant.getCreatedAt(),
                tenant.getAddressLine(), tenant.getCity(), tenant.getSubdivision(),
                tenant.getPostalCode(), tenant.getCountry(), tenant.getPhone(),
                tenant.getEmail());
    }
}
