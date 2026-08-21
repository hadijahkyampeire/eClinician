package com.eclinician.repositories;

import com.eclinician.domains.entities.RefreshToken;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Not tenant-scoped, and deliberately so: a refresh token is presented before anyone
 * has been identified, so it has to be findable by its hash alone. The tenant is read
 * back from the account the token names.
 */
public interface RefreshTokenRepository extends JpaRepository<RefreshToken, UUID> {

    Optional<RefreshToken> findByTokenHash(String tokenHash);

    List<RefreshToken> findByUserEmailIgnoreCaseAndRevokedAtIsNull(String userEmail);

    long deleteByExpiresAtBefore(Instant cutoff);
}
