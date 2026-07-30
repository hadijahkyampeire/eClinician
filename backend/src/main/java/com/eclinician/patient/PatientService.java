package com.eclinician.patient;

import com.eclinician.web.NotFoundException;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

@Service
public class PatientService {

    private final PatientRepository repo;

    PatientService(PatientRepository repo) {
        this.repo = repo;
    }

    Page<PatientResponse> list(String tenantId, String q, Pageable pageable) {
        Page<Patient> page = (q == null || q.isBlank())
                ? repo.findByTenantId(tenantId, pageable)
                : repo.search(tenantId, q.trim(), pageable);
        return page.map(PatientResponse::from);
    }

    PatientResponse get(String tenantId, UUID id) {
        return PatientResponse.from(find(tenantId, id));
    }

    PatientResponse create(String tenantId, PatientRequest req) {
        Patient p = new Patient();
        p.setTenantId(tenantId);
        apply(p, req);
        return PatientResponse.from(repo.save(p));
    }

    PatientResponse update(String tenantId, UUID id, PatientRequest req) {
        Patient p = find(tenantId, id);
        apply(p, req);
        return PatientResponse.from(repo.save(p));
    }

    void delete(String tenantId, UUID id) {
        repo.delete(find(tenantId, id));
    }

    private Patient find(String tenantId, UUID id) {
        return repo.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new NotFoundException("Patient not found"));
    }

    private void apply(Patient p, PatientRequest r) {
        p.setFirstName(r.firstName());
        p.setLastName(r.lastName());
        p.setDateOfBirth(r.dateOfBirth());
        p.setSex(r.sex());
        p.setPhone(r.phone());
        p.setEmail(r.email());
        p.setNationalId(r.nationalId());
        p.setAddress(r.address());
    }
}
