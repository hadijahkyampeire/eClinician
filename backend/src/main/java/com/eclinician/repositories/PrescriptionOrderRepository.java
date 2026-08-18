package com.eclinician.repositories;

import com.eclinician.domains.entities.PrescriptionOrder;
import com.eclinician.domains.enums.PrescriptionStatus;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

/** All lookups are tenant-scoped so hospitals never see each other's prescriptions. */
public interface PrescriptionOrderRepository extends JpaRepository<PrescriptionOrder, UUID> {

    List<PrescriptionOrder> findByTenantIdOrderByCreatedAtDesc(String tenantId);

    List<PrescriptionOrder> findByTenantIdAndStatusOrderByCreatedAtDesc(
            String tenantId, PrescriptionStatus status);

    List<PrescriptionOrder> findByTenantIdAndPatientIdOrderByCreatedAtDesc(
            String tenantId, UUID patientId);

    Optional<PrescriptionOrder> findByIdAndTenantId(UUID id, String tenantId);

    /** Guards against creating a second set of orders if finalize is retried. */
    boolean existsByTenantIdAndEncounterId(String tenantId, UUID encounterId);

    long countByTenantIdAndStatus(String tenantId, PrescriptionStatus status);

    long countByTenantIdAndStatusAndDispensedAtAfter(
            String tenantId, PrescriptionStatus status, Instant dispensedAfter);
}
