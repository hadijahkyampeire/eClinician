package com.eclinician.services;

import com.eclinician.domains.dtos.AvailabilityRequest;
import com.eclinician.domains.dtos.AvailabilityResponse;
import com.eclinician.domains.entities.AppUser;
import com.eclinician.domains.entities.ClinicianAvailability;
import com.eclinician.domains.enums.UserRole;
import com.eclinician.repositories.ClinicianAvailabilityRepository;
import com.eclinician.repositories.UserRepository;
import com.eclinician.web.ConflictException;
import com.eclinician.web.NotFoundException;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ClinicianAvailabilityService {
    private final ClinicianAvailabilityRepository availability;
    private final UserRepository users;

    public ClinicianAvailabilityService(
            ClinicianAvailabilityRepository availability, UserRepository users) {
        this.availability = availability;
        this.users = users;
    }

    public List<AvailabilityResponse> getMine(String tenantId, String email) {
        AppUser clinician = clinician(tenantId, email);
        return availability.findByTenantIdAndClinicianIdOrderByDayOfWeekAscStartTimeAsc(
                tenantId, clinician.getId()).stream().map(AvailabilityResponse::from).toList();
    }

    @Transactional
    public List<AvailabilityResponse> replaceMine(
            String tenantId, String email, AvailabilityRequest request) {
        AppUser clinician = clinician(tenantId, email);
        for (AvailabilityRequest.Shift shift : request.shifts()) {
            if (!shift.endTime().isAfter(shift.startTime())) {
                throw new ConflictException("Shift end time must be after its start time");
            }
        }
        availability.deleteByTenantIdAndClinicianId(tenantId, clinician.getId());
        availability.flush();
        List<ClinicianAvailability> saved = request.shifts().stream().map(shift -> {
            ClinicianAvailability value = new ClinicianAvailability();
            value.setTenantId(tenantId);
            value.setClinicianId(clinician.getId());
            value.setDayOfWeek(shift.dayOfWeek());
            value.setStartTime(shift.startTime());
            value.setEndTime(shift.endTime());
            value.setRoom(shift.room().trim());
            return value;
        }).map(availability::save).toList();
        return saved.stream().map(AvailabilityResponse::from).toList();
    }

    private AppUser clinician(String tenantId, String email) {
        AppUser user = users.findByEmailIgnoreCase(email)
                .filter(value -> tenantId.equals(value.getTenantId()))
                .orElseThrow(() -> new NotFoundException("Clinician not found"));
        if (user.getRole() != UserRole.CLINICIAN) {
            throw new ConflictException("Availability belongs to clinician accounts");
        }
        return user;
    }
}
