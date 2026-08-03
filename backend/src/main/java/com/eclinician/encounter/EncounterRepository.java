package com.eclinician.encounter;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EncounterRepository extends JpaRepository<Encounter, UUID> {
    List<Encounter> findByTenantIdOrderByCreatedAtDesc(String tenantId);
    List<Encounter> findByTenantIdAndPatientIdOrderByCreatedAtDesc(String tenantId, UUID patientId);
    Optional<Encounter> findByIdAndTenantId(UUID id, String tenantId);
    Optional<Encounter> findByAppointmentIdAndTenantId(UUID appointmentId, String tenantId);
}
