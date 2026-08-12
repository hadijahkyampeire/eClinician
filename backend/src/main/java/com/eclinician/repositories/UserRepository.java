package com.eclinician.repositories;

import com.eclinician.domains.entities.AppUser;
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
}
