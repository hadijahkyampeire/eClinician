package com.eclinician.services;

import com.eclinician.domains.dtos.StaffRequest;
import com.eclinician.domains.dtos.StaffResponse;
import com.eclinician.domains.entities.AppUser;
import com.eclinician.domains.enums.UserRole;
import com.eclinician.repositories.UserRepository;
import com.eclinician.repositories.ClinicianAvailabilityRepository;
import com.eclinician.web.ConflictException;
import com.eclinician.web.NotFoundException;
import java.util.List;
import java.util.UUID;
import java.time.Instant;
import java.time.ZoneId;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** SRS use case 6: an administrator manages the staff accounts of their own clinic. */
@Service
public class StaffService {

    private final UserRepository users;
    private final PasswordEncoder passwords;
    private final ClinicianAvailabilityRepository availability;

    public StaffService(UserRepository users, PasswordEncoder passwords,
            ClinicianAvailabilityRepository availability) {
        this.users = users;
        this.passwords = passwords;
        this.availability = availability;
    }

    public List<StaffResponse> list(String tenantId) {
        return users.findByTenantIdOrderByNameAsc(tenantId).stream()
                .map(StaffResponse::from).toList();
    }

    /** Active clinicians only: a deactivated doctor must not appear in a booking form. */
    public List<StaffResponse> clinicians(String tenantId) {
        return clinicians(tenantId, null);
    }

    /** At a booking time, reception sees only clinicians whose published shift covers it. */
    public List<StaffResponse> clinicians(String tenantId, Instant at) {
        Map<UUID, String> availableRooms = at == null ? null
                : availability.findAvailableShifts(tenantId,
                        at.atZone(ZoneId.systemDefault()).getDayOfWeek(),
                        at.atZone(ZoneId.systemDefault()).toLocalTime()).stream()
                        .collect(Collectors.toMap(
                                shift -> shift.getClinicianId(), shift -> shift.getRoom(),
                                (first, ignored) -> first));
        return users.findByTenantIdAndRoleAndActiveTrueOrderByNameAsc(tenantId, UserRole.CLINICIAN)
                .stream().filter(user -> availableRooms == null
                        || availableRooms.containsKey(user.getId()))
                .map(user -> StaffResponse.from(user,
                        availableRooms == null ? null : availableRooms.get(user.getId())))
                .toList();
    }

    @Transactional
    public StaffResponse create(String tenantId, StaffRequest request) {
        String email = request.email().trim();
        if (users.existsByEmailIgnoreCase(email)) {
            throw new ConflictException("An account with this email already exists");
        }
        if (request.password() == null || request.password().isBlank()) {
            throw new ConflictException("A password is required for a new account");
        }
        AppUser user = new AppUser();
        user.setTenantId(tenantId);
        user.setEmail(email);
        user.setPasswordHash(passwords.encode(request.password()));
        apply(request, user);
        AppUser saved = users.save(user);
        // A doctor nobody can book is not on the rota yet. Give them the clinic's hours
        // now rather than waiting for them to sign in and publish their own.
        if (saved.getRole() == UserRole.CLINICIAN
                && !availability.existsByTenantIdAndClinicianId(tenantId, saved.getId())) {
            availability.saveAll(DefaultRota.forClinician(tenantId, saved.getId(), null));
        }
        return StaffResponse.from(saved);
    }

    @Transactional
    public StaffResponse update(String tenantId, UUID id, StaffRequest request) {
        AppUser user = find(tenantId, id);
        // The email identifies the account, so the SRS makes it unwritable after creation.
        if (request.password() != null && !request.password().isBlank()) {
            user.setPasswordHash(passwords.encode(request.password()));
        }
        apply(request, user);
        return StaffResponse.from(users.save(user));
    }

    /**
     * Deactivation rather than deletion: the account stops working immediately, and the
     * work it already recorded keeps its author.
     */
    @Transactional
    public StaffResponse setActive(String tenantId, UUID id, boolean active, String actingEmail) {
        AppUser user = find(tenantId, id);
        if (!active && user.getEmail().equalsIgnoreCase(actingEmail)) {
            throw new ConflictException("You cannot deactivate your own account");
        }
        user.setActive(active);
        return StaffResponse.from(users.save(user));
    }

    private AppUser find(String tenantId, UUID id) {
        return users.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new NotFoundException("Staff account not found"));
    }

    private void apply(StaffRequest request, AppUser user) {
        user.setName(request.name().trim());
        user.setRole(request.role());
        user.setSpecialty(request.role() == UserRole.CLINICIAN && request.specialty() != null
                && !request.specialty().isBlank() ? request.specialty().trim() : null);
    }
}
