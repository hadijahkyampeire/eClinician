package com.eclinician.appointment;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AppointmentRepository extends JpaRepository<Appointment, UUID> {

    Optional<Appointment> findByIdAndTenantId(UUID id, String tenantId);

    Optional<Appointment> findFirstByTenantIdAndPatientIdAndStatusInOrderByCreatedAtDesc(
            String tenantId, UUID patientId, Collection<AppointmentStatus> statuses);

    List<Appointment> findByTenantId(String tenantId, Sort sort);

    List<Appointment> findByTenantIdAndPatientId(String tenantId, UUID patientId, Sort sort);
}
