package com.eclinician.services;

import com.eclinician.domains.dtos.response.PlatformPatientRow;
import com.eclinician.domains.dtos.response.PlatformStaffRow;
import com.eclinician.domains.entities.Tenant;
import com.eclinician.repositories.PatientRepository;
import com.eclinician.repositories.TenantRepository;
import com.eclinician.repositories.UserRepository;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

/**
 * The two directories the platform console reads across every hospital at once.
 *
 * <p>Everything here is read-only by design. The platform operator answers "who runs this
 * hospital, and how big is it" — editing staff and patients stays inside the hospital that
 * owns them, where the tenant scope still applies.
 *
 * <p>Hospital names are fetched once per call and joined in memory rather than through a
 * relationship: {@code tenant_id} is a plain column on every row, and a handful of
 * hospitals is cheaper as a map than as a join repeated down every result.
 */
@Service
public class PlatformDirectoryService {

    private final UserRepository users;
    private final PatientRepository patients;
    private final TenantRepository tenants;

    public PlatformDirectoryService(UserRepository users, PatientRepository patients,
            TenantRepository tenants) {
        this.users = users;
        this.patients = patients;
        this.tenants = tenants;
    }

    /** Every clinical account. The platform admin belongs to no hospital, so is not one. */
    public List<PlatformStaffRow> staff() {
        Map<String, String> hospitals = hospitalNames();
        return users.findByPlatformAdminFalseOrderByNameAsc().stream()
                .map(user -> PlatformStaffRow.from(user, hospitals.get(user.getTenantId())))
                .toList();
    }

    /** Newest first, so the console reads as a registration feed across all hospitals. */
    public List<PlatformPatientRow> patients() {
        Map<String, String> hospitals = hospitalNames();
        return patients.findAll(Sort.by(Sort.Direction.DESC, "createdAt")).stream()
                .map(row -> PlatformPatientRow.from(row, hospitals.get(row.getTenantId())))
                .toList();
    }

    private Map<String, String> hospitalNames() {
        return tenants.findAll().stream().collect(Collectors.toMap(
                Tenant::getId, Tenant::getName, (first, second) -> first, LinkedHashMap::new));
    }
}
