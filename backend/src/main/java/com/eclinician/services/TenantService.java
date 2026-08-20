package com.eclinician.services;

import com.eclinician.domains.dtos.ClinicSettingsRequest;
import com.eclinician.domains.dtos.PlatformStats;
import com.eclinician.domains.dtos.TenantRequest;
import com.eclinician.domains.dtos.TenantResponse;
import com.eclinician.domains.entities.AppUser;
import com.eclinician.domains.entities.Tenant;
import com.eclinician.domains.enums.UserRole;
import com.eclinician.repositories.TenantRepository;
import com.eclinician.repositories.UserRepository;
import com.eclinician.web.ConflictException;
import com.eclinician.web.NotFoundException;
import java.util.List;
import java.util.Optional;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Hospital onboarding and subscriptions. Only the platform administrator calls this. */
@Service
public class TenantService {

    private final TenantRepository tenants;
    private final UserRepository users;
    private final PasswordEncoder passwords;

    public TenantService(TenantRepository tenants, UserRepository users,
            PasswordEncoder passwords) {
        this.tenants = tenants;
        this.users = users;
        this.passwords = passwords;
    }

    public List<TenantResponse> list() {
        return tenants.findAllByOrderByNameAsc().stream().map(TenantResponse::from).toList();
    }

    public PlatformStats stats() {
        return new PlatformStats(tenants.count(), tenants.countByActive(true), users.count());
    }

    /** What a hospital's own staff see about it: its name and its colour. */
    public TenantResponse read(String tenantId) {
        return TenantResponse.from(find(tenantId));
    }

    /**
     * Onboards a hospital and creates the administrator who will run it. Both happen in
     * one transaction: a hospital nobody can sign in to would be worse than none.
     */
    @Transactional
    public TenantResponse create(TenantRequest request) {
        String id = request.id().trim();
        if (tenants.existsById(id)) {
            throw new ConflictException("A hospital with this identifier already exists");
        }
        Tenant tenant = new Tenant();
        tenant.setId(id);
        apply(tenant, request);
        Tenant saved = tenants.save(tenant);
        addAdministrator(saved, request);
        return TenantResponse.from(saved);
    }

    /** The clinic's own name and colour, changed by its administrator. */
    @Transactional
    public TenantResponse updateSettings(String tenantId, ClinicSettingsRequest request) {
        Tenant tenant = find(tenantId);
        tenant.setName(request.name().trim());
        tenant.setPrimaryColor(request.primaryColor().trim());
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

    private void addAdministrator(Tenant tenant, TenantRequest request) {
        if (request.adminEmail() == null || request.adminEmail().isBlank()) return;
        String email = request.adminEmail().trim();
        if (users.existsByEmailIgnoreCase(email)) {
            throw new ConflictException("An account with this email already exists");
        }
        if (request.adminPassword() == null || request.adminPassword().isBlank()) {
            throw new ConflictException("The first administrator needs a password");
        }
        AppUser admin = new AppUser();
        admin.setTenantId(tenant.getId());
        admin.setName(request.adminName() == null || request.adminName().isBlank()
                ? "Administrator" : request.adminName().trim());
        admin.setEmail(email);
        admin.setPasswordHash(passwords.encode(request.adminPassword()));
        admin.setRole(UserRole.ADMINISTRATOR);
        users.save(admin);
    }

    private Tenant find(String id) {
        return tenants.findById(id)
                .orElseThrow(() -> new NotFoundException("Hospital not found"));
    }

    private void apply(Tenant tenant, TenantRequest request) {
        tenant.setName(request.name().trim());
        tenant.setPrimaryColor(request.primaryColor().trim());
        tenant.setModuleList(request.modules());
    }
}
