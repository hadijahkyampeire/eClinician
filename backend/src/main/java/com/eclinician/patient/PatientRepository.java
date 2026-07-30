package com.eclinician.patient;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

/** All lookups are tenant-scoped so hospitals never see each other's data. */
public interface PatientRepository extends JpaRepository<Patient, UUID> {

    Page<Patient> findByTenantId(String tenantId, Pageable pageable);

    Optional<Patient> findByIdAndTenantId(UUID id, String tenantId);

    boolean existsByTenantId(String tenantId);

    @Query("""
        select p from Patient p
        where p.tenantId = :tenantId and (
            lower(p.firstName) like lower(concat('%', :q, '%')) or
            lower(p.lastName)  like lower(concat('%', :q, '%')) or
            p.phone like concat('%', :q, '%'))
        """)
    Page<Patient> search(String tenantId, String q, Pageable pageable);
}
