package com.eclinician.repositories;

import com.eclinician.domains.entities.AppUser;
import com.eclinician.domains.enums.UserRole;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * The one repository that is deliberately not tenant-scoped: at login there is no
 * tenant yet, and the email is what decides which one the caller gets.
 */
public interface UserRepository extends JpaRepository<AppUser, UUID> {

    Optional<AppUser> findByEmailIgnoreCase(String email);

    boolean existsByEmailIgnoreCase(String email);

    List<AppUser> findByTenantIdOrderByNameAsc(String tenantId);

    List<AppUser> findByTenantIdAndRoleAndActiveTrueOrderByNameAsc(String tenantId, UserRole role);

    Optional<AppUser> findByIdAndTenantId(UUID id, String tenantId);
}
