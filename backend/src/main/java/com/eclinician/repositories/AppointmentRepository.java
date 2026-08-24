package com.eclinician.repositories;

import com.eclinician.domains.entities.Appointment;
import com.eclinician.domains.enums.AppointmentStatus;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface AppointmentRepository extends JpaRepository<Appointment, UUID> {

    Optional<Appointment> findByIdAndTenantId(UUID id, String tenantId);

    boolean existsByTenantIdAndPatientId(String tenantId, UUID patientId);

    Optional<Appointment> findFirstByTenantIdAndPatientIdAndStatusInOrderByCreatedAtDesc(
            String tenantId, UUID patientId, Collection<AppointmentStatus> statuses);

    /** One query answers both SRS scheduling rules: the doctor's slot, and who is in it. */
    List<Appointment> findByTenantIdAndDoctorIdAndScheduledAtAndStatusIn(
            String tenantId, UUID doctorId, Instant scheduledAt,
            Collection<AppointmentStatus> statuses);

    /** Check-ins left open from an earlier day — see CheckInExpiry. */
    List<Appointment> findByTenantIdAndStatusInAndCheckedInAtBefore(
            String tenantId, Collection<AppointmentStatus> statuses, Instant before);

    List<Appointment> findByTenantId(String tenantId, Sort sort);

    List<Appointment> findByTenantIdAndPatientId(String tenantId, UUID patientId, Sort sort);

    long countByTenantIdAndScheduledAtBetween(String tenantId, Instant from, Instant to);

    @Query("select count(a) from Appointment a where a.tenantId = ?1 and a.status = ?2 "
            + "and (a.doctorId = ?3 or a.doctorId is null)")
    long countVisibleToClinician(String tenantId, AppointmentStatus status, UUID clinicianId);
}
