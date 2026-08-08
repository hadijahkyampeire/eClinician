package com.eclinician.patient;

import com.eclinician.appointment.PatientCareStatus;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

/** All lookups are tenant-scoped so hospitals never see each other's data. */
public interface PatientRepository
        extends JpaRepository<Patient, UUID>, JpaSpecificationExecutor<Patient> {

    Page<Patient> findByTenantId(String tenantId, Pageable pageable);

    Optional<Patient> findByIdAndTenantId(UUID id, String tenantId);

    boolean existsByTenantId(String tenantId);

    long countByTenantId(String tenantId);

    long countByTenantIdAndCreatedAtAfter(String tenantId, Instant createdAfter);

    long countByTenantIdAndActiveCareStatus(String tenantId, PatientCareStatus status);

}
