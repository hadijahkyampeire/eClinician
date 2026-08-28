package com.eclinician.services;

import com.eclinician.domains.dtos.request.ClinicSettingsRequest;
import com.eclinician.domains.dtos.request.TenantRequest;
import com.eclinician.domains.dtos.response.HospitalFilterOptions;
import com.eclinician.domains.dtos.response.PlatformStats;
import com.eclinician.domains.dtos.response.TenantResponse;
import com.eclinician.domains.entities.AppUser;
import com.eclinician.domains.entities.Tenant;
import com.eclinician.domains.enums.UserRole;
import com.eclinician.exceptions.ConflictException;
import com.eclinician.exceptions.NotFoundException;
import com.eclinician.repositories.TenantRepository;
import com.eclinician.repositories.UserRepository;
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

    /**
     * The console's list, filtered in the database rather than in the browser. A blank
     * filter and an absent one mean the same thing, so both become the empty string the
     * query reads as "do not filter on this".
     */
    public List<TenantResponse> list(String search, String country, String subdivision) {
        return tenants.search(asFilter(search), asFilter(country).toUpperCase(),
                        asFilter(subdivision))
                .stream().map(TenantResponse::from).toList();
    }

    /** Only values a hospital actually has, so no filter can select an empty result. */
    public HospitalFilterOptions filterOptions(String country) {
        return new HospitalFilterOptions(tenants.findDistinctCountries(),
                tenants.findDistinctSubdivisions(asFilter(country).toUpperCase()));
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
        tenant.setAddressLine(trimToNull(request.addressLine()));
        tenant.setCity(trimToNull(request.city()));
        tenant.setSubdivision(trimToNull(request.subdivision()));
        tenant.setPostalCode(trimToNull(request.postalCode()));
        // Stored upper case so the country filter is a plain equality match, whatever
        // case the console happened to send.
        tenant.setCountry(upperOrNull(request.country()));
        tenant.setPhone(trimToNull(request.phone()));
        tenant.setEmail(trimToNull(request.email()));
        // An unknown zone would silently send the whole clinic back to the default, so a
        // blank is "leave it" and anything the JVM does not recognise is refused outright.
        String zone = trimToNull(request.timeZone());
        if (zone != null) {
            if (!java.time.ZoneId.getAvailableZoneIds().contains(zone)) {
                throw new ConflictException("Unknown time zone: " + zone);
            }
            tenant.setTimeZone(zone);
        }
    }

    /** A filter nobody set. Never null — see the note on {@link TenantRepository#search}. */
    private static String asFilter(String value) {
        return value == null ? "" : value.trim();
    }

    /** An empty box in the form and an absent field mean the same thing: not recorded. */
    private static String trimToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private static String upperOrNull(String value) {
        String trimmed = trimToNull(value);
        return trimmed == null ? null : trimmed.toUpperCase();
    }
}
