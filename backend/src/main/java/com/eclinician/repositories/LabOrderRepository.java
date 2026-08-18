package com.eclinician.repositories;

import com.eclinician.domains.entities.LabOrder;
import com.eclinician.domains.enums.LabStatus;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

/** All lookups are tenant-scoped so hospitals never see each other's lab work. */
public interface LabOrderRepository extends JpaRepository<LabOrder, UUID> {

    List<LabOrder> findByTenantIdOrderByCreatedAtDesc(String tenantId);

    List<LabOrder> findByTenantIdAndStatusOrderByCreatedAtDesc(String tenantId, LabStatus status);

    List<LabOrder> findByTenantIdAndPatientIdOrderByCreatedAtDesc(String tenantId, UUID patientId);

    Optional<LabOrder> findByIdAndTenantId(UUID id, String tenantId);

    /** Guards against creating a second set of orders if finalize is retried. */
    boolean existsByTenantIdAndEncounterId(String tenantId, UUID encounterId);

    long countByTenantIdAndStatus(String tenantId, LabStatus status);

    long countByTenantIdAndStatusAndResultedAtAfter(
            String tenantId, LabStatus status, Instant resultedAfter);
}
