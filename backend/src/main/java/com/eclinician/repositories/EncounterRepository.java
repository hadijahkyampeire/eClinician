package com.eclinician.repositories;

import com.eclinician.domains.entities.Encounter;
import com.eclinician.domains.enums.EncounterStatus;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface EncounterRepository extends JpaRepository<Encounter, UUID> {
    List<Encounter> findByTenantIdOrderByCreatedAtDesc(String tenantId);
    List<Encounter> findByTenantIdAndPatientIdOrderByCreatedAtDesc(String tenantId, UUID patientId);
    Optional<Encounter> findByIdAndTenantId(UUID id, String tenantId);
    boolean existsByTenantIdAndPatientId(String tenantId, UUID patientId);
    Optional<Encounter> findByAppointmentIdAndTenantId(UUID appointmentId, String tenantId);

    long countByTenantIdAndStatus(String tenantId, EncounterStatus status);

    long countByTenantIdAndFinalizedAtAfter(String tenantId, Instant finalizedAfter);

    /** Clinicians who have documented at least one encounter — our only staff signal so far. */
    @Query("select count(distinct e.clinicianName) from Encounter e where e.tenantId = ?1")
    long countClinicians(String tenantId);
}
