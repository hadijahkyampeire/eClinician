package com.eclinician.patient;

import com.eclinician.web.NotFoundException;
import com.eclinician.appointment.PatientCareStatus;
import jakarta.persistence.criteria.Predicate;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

@Service
public class PatientService {

    private final PatientRepository repo;

    PatientService(PatientRepository repo) {
        this.repo = repo;
    }

    Page<PatientResponse> list(String tenantId, String q, String sex, String country,
            String careStatus, LocalDate dobFrom, LocalDate dobTo, LocalDate enrolledFrom,
            LocalDate enrolledTo, Pageable pageable) {
        Specification<Patient> filters = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.<String>get("tenantId"), tenantId));

            if (q != null && !q.isBlank()) {
                String pattern = "%" + q.trim().toLowerCase(Locale.ROOT) + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.<String>get("firstName")), pattern),
                        cb.like(cb.lower(root.<String>get("lastName")), pattern),
                        cb.like(root.<String>get("phone"), pattern)));
            }
            if (sex != null && !sex.isBlank()) {
                predicates.add(cb.equal(root.<String>get("sex"), sex.trim()));
            }
            if (country != null && !country.isBlank()) {
                predicates.add(cb.equal(root.<String>get("country"), country.trim()));
            }
            if ("NONE".equals(careStatus)) {
                predicates.add(cb.isNull(root.get("activeCareStatus")));
            } else if (careStatus != null && !careStatus.isBlank()) {
                predicates.add(cb.equal(
                        root.<PatientCareStatus>get("activeCareStatus"),
                        PatientCareStatus.valueOf(careStatus.trim())));
            }
            if (dobFrom != null) {
                predicates.add(cb.greaterThanOrEqualTo(
                        root.<LocalDate>get("dateOfBirth"), dobFrom));
            }
            if (dobTo != null) {
                predicates.add(cb.lessThanOrEqualTo(
                        root.<LocalDate>get("dateOfBirth"), dobTo));
            }
            if (enrolledFrom != null) {
                predicates.add(cb.greaterThanOrEqualTo(
                        root.<Instant>get("createdAt"),
                        enrolledFrom.atStartOfDay().toInstant(ZoneOffset.UTC)));
            }
            if (enrolledTo != null) {
                predicates.add(cb.lessThan(
                        root.<Instant>get("createdAt"),
                        enrolledTo.plusDays(1).atStartOfDay().toInstant(ZoneOffset.UTC)));
            }
            return cb.and(predicates.toArray(Predicate[]::new));
        };

        return repo.findAll(filters, pageable).map(PatientResponse::from);
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
        p.setAddressLine(r.addressLine());
        p.setCity(r.city());
        p.setDistrict(r.district());
        p.setStateProvince(r.stateProvince());
        p.setCountry(r.country());
    }
}
