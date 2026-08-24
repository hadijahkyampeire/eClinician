package com.eclinician.domains.dtos;

import com.eclinician.domains.entities.AppUser;
import java.time.Instant;
import java.util.UUID;

/** A staff account as the administrator sees it. The password hash never leaves the API. */
public record StaffResponse(
        UUID id,
        String name,
        String email,
        String role,
        String roleLabel,
        String specialty,
        boolean active,
        Instant createdAt) {

    public static StaffResponse from(AppUser user) {
        return new StaffResponse(user.getId(), user.getName(), user.getEmail(),
                user.getRole().name(), user.getRole().label(), user.getSpecialty(), user.isActive(),
                user.getCreatedAt());
    }
}
