package com.eclinician.repositories;

import com.eclinician.domains.entities.ClinicianAvailability;
import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface ClinicianAvailabilityRepository
        extends JpaRepository<ClinicianAvailability, UUID> {
    List<ClinicianAvailability> findByTenantIdAndClinicianIdOrderByDayOfWeekAscStartTimeAsc(
            String tenantId, UUID clinicianId);

    void deleteByTenantIdAndClinicianId(String tenantId, UUID clinicianId);

    boolean existsByTenantIdAndClinicianId(String tenantId, UUID clinicianId);

    @Query("select a from ClinicianAvailability a "
            + "where a.tenantId = ?1 and a.dayOfWeek = ?2 "
            + "and a.startTime <= ?3 and a.endTime > ?3")
    List<ClinicianAvailability> findAvailableShifts(
            String tenantId, DayOfWeek dayOfWeek, LocalTime time);

    @Query("select a from ClinicianAvailability a "
            + "where a.tenantId = ?1 and a.clinicianId = ?2 and a.dayOfWeek = ?3 "
            + "and a.startTime <= ?4 and a.endTime > ?4")
    List<ClinicianAvailability> findShiftAt(
            String tenantId, UUID clinicianId, DayOfWeek dayOfWeek, LocalTime time);
}
