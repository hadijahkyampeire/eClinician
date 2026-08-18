package com.eclinician.services;

import com.eclinician.domains.dtos.PatientRequest;
import com.eclinician.domains.dtos.PatientResponse;
import com.eclinician.domains.entities.Patient;
import com.eclinician.domains.enums.PatientCareStatus;
import com.eclinician.repositories.AppointmentRepository;
import com.eclinician.repositories.EncounterRepository;
import com.eclinician.repositories.PatientRepository;
import com.eclinician.web.ConflictException;
import com.eclinician.web.NotFoundException;
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

    // A UUID no patient can have, so the "and not this one" guard also works on create.
    private static final UUID NEW_PATIENT = new UUID(0L, 0L);

    private final PatientRepository repo;
    private final AppointmentRepository appointments;
    private final EncounterRepository encounters;

    public PatientService(PatientRepository repo, AppointmentRepository appointments,
            EncounterRepository encounters) {
        this.repo = repo;
        this.appointments = appointments;
        this.encounters = encounters;
    }

    public Page<PatientResponse> list(String tenantId, String q, String sex, String country,
            String careStatus, String nationalId, LocalDate dobFrom, LocalDate dobTo,
            LocalDate enrolledFrom,
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
            if (nationalId != null && !nationalId.isBlank()) {
                predicates.add(cb.like(
                        cb.lower(root.<String>get("nationalId")),
                        "%" + nationalId.trim().toLowerCase(Locale.ROOT) + "%"));
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

    public PatientResponse get(String tenantId, UUID id) {
        return PatientResponse.from(find(tenantId, id));
    }

    public PatientResponse create(String tenantId, PatientRequest req) {
        Patient p = new Patient();
        p.setTenantId(tenantId);
        requireUnique(tenantId, req, NEW_PATIENT);
        apply(p, req);
        p.setNationalId(req.nationalId());
        return PatientResponse.from(repo.save(p));
    }

    public PatientResponse update(String tenantId, UUID id, PatientRequest req) {
        Patient p = find(tenantId, id);
        requireUnique(tenantId, req, id);
        requireSameNationalId(p, req);
        apply(p, req);
        // A patient registered without one may still have it filled in, once.
        if (p.getNationalId() == null || p.getNationalId().isBlank()) {
            p.setNationalId(req.nationalId());
        }
        return PatientResponse.from(repo.save(p));
    }

    public void delete(String tenantId, UUID id) {
        Patient patient = find(tenantId, id);
        // SRS: a profile linked to visits or records is history, not a mistake to erase.
        if (appointments.existsByTenantIdAndPatientId(tenantId, id)
                || encounters.existsByTenantIdAndPatientId(tenantId, id)) {
            throw new ConflictException(
                    "This patient has visits or records and cannot be deleted");
        }
        repo.delete(patient);
    }

    /** SRS: no two patients in one clinic may share a phone number or national ID. */
    private void requireUnique(String tenantId, PatientRequest req, UUID selfId) {
        if (req.phone() != null && !req.phone().isBlank()
                && repo.existsByTenantIdAndPhoneAndIdNot(tenantId, req.phone().trim(), selfId)) {
            throw new ConflictException("Another patient already uses this phone number");
        }
        if (req.nationalId() != null && !req.nationalId().isBlank()
                && repo.existsByTenantIdAndNationalIdIgnoreCaseAndIdNot(
                        tenantId, req.nationalId().trim(), selfId)) {
            throw new ConflictException("Another patient already uses this national ID");
        }
    }

    /** SRS 1.2: the national ID / passport number identifies the patient, so it is unwritable. */
    private void requireSameNationalId(Patient p, PatientRequest req) {
        String current = p.getNationalId();
        if (current == null || current.isBlank()) return;
        String incoming = req.nationalId() == null ? "" : req.nationalId().trim();
        if (!current.equalsIgnoreCase(incoming)) {
            throw new ConflictException("The national ID cannot be changed after registration");
        }
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
        // nationalId is deliberately absent: SRS 1.2 makes it unwritable after creation.
        p.setAddressLine(r.addressLine());
        p.setCity(r.city());
        p.setDistrict(r.district());
        p.setStateProvince(r.stateProvince());
        p.setCountry(r.country());
    }
}
