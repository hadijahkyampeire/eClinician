package com.eclinician.encounter;

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
    Optional<Encounter> findByAppointmentIdAndTenantId(UUID appointmentId, String tenantId);

    long countByTenantIdAndStatus(String tenantId, EncounterStatus status);

    long countByTenantIdAndFinalizedAtAfter(String tenantId, Instant finalizedAfter);

    /** Clinicians who have documented at least one encounter — our only staff signal so far. */
    @Query("select count(distinct e.clinicianName) from Encounter e where e.tenantId = ?1")
    long countClinicians(String tenantId);

    @Query("select count(e) from Encounter e where e.tenantId = ?1"
            + " and e.prescriptions is not null and length(trim(e.prescriptions)) > 0")
    long countWithPrescriptions(String tenantId);

    @Query("select count(e) from Encounter e where e.tenantId = ?1"
            + " and e.labRequests is not null and length(trim(e.labRequests)) > 0")
    long countWithLabRequests(String tenantId);
}
