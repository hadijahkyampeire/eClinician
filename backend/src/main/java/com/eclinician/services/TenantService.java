package com.eclinician.services;

import com.eclinician.domains.dtos.PlatformStats;
import com.eclinician.domains.dtos.TenantRequest;
import com.eclinician.domains.dtos.TenantResponse;
import com.eclinician.domains.entities.Tenant;
import com.eclinician.repositories.TenantRepository;
import com.eclinician.repositories.UserRepository;
import com.eclinician.web.ConflictException;
import com.eclinician.web.NotFoundException;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Hospital onboarding and subscriptions. Only the platform administrator calls this. */
@Service
public class TenantService {

    private final TenantRepository tenants;
    private final UserRepository users;

    public TenantService(TenantRepository tenants, UserRepository users) {
        this.tenants = tenants;
        this.users = users;
    }

    public List<TenantResponse> list() {
        return tenants.findAllByOrderByNameAsc().stream().map(TenantResponse::from).toList();
    }

    public PlatformStats stats() {
        return new PlatformStats(tenants.count(), tenants.countByActive(true), users.count());
    }

    @Transactional
    public TenantResponse create(TenantRequest request) {
        String id = request.id().trim();
        if (tenants.existsById(id)) {
            throw new ConflictException("A hospital with this identifier already exists");
        }
        Tenant tenant = new Tenant();
        tenant.setId(id);
        apply(tenant, request);
        return TenantResponse.from(tenants.save(tenant));
    }

    /** The identifier is not editable: it is written into every row the hospital owns. */
    @Transactional
    public TenantResponse update(String id, TenantRequest request) {
        Tenant tenant = find(id);
        apply(tenant, request);
        return TenantResponse.from(tenants.save(tenant));
    }

    /** Suspending a hospital keeps its data and stops its staff signing in. */
    @Transactional
    public TenantResponse setActive(String id, boolean active) {
        Tenant tenant = find(id);
        tenant.setActive(active);
        return TenantResponse.from(tenants.save(tenant));
    }

    /** What login sends the browser: the branding and the modules that were bought. */
    public Optional<Tenant> configFor(String tenantId) {
        return tenantId == null ? Optional.empty() : tenants.findById(tenantId);
    }

    private Tenant find(String id) {
        return tenants.findById(id).orElseThrow(() -> new NotFoundException("Hospital not found"));
    }

    private void apply(Tenant tenant, TenantRequest request) {
        tenant.setName(request.name().trim());
        tenant.setPrimaryColor(request.primaryColor().trim());
        tenant.setModuleList(request.modules());
    }
}
