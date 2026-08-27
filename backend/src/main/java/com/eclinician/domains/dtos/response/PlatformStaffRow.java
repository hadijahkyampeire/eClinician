package com.eclinician.domains.dtos.response;

import com.eclinician.domains.entities.AppUser;
import java.time.Instant;

/**
 * A staff account as the platform console sees it: which hospital it belongs to and
 * whether it can sign in. Read-only — hiring and deactivating belong to the hospital's
 * own administrator, not to the platform.
 */
public record PlatformStaffRow(
        String id,
        String name,
        String email,
        String roleLabel,
        String specialty,
        boolean active,
        Instant createdAt,
        String hospitalId,
        String hospitalName) {

    public static PlatformStaffRow from(AppUser user, String hospitalName) {
        return new PlatformStaffRow(user.getId().toString(), user.getName(), user.getEmail(),
                user.getRole().label(), user.getSpecialty(), user.isActive(),
                user.getCreatedAt(), user.getTenantId(), hospitalName);
    }
}
