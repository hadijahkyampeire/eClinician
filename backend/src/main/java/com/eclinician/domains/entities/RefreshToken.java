package com.eclinician.domains.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

/**
 * One long-lived token, held by one browser, that can be traded for a fresh access
 * token. The raw value is shown to its owner once and never stored: what is kept here
 * is a SHA-256 hash, so this table alone cannot be used to sign in as anybody.
 */
@Entity
@Table(name = "refresh_tokens")
@Getter
@Setter
public class RefreshToken {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true, length = 64)
    private String tokenHash;

    /** The account this token speaks for. Roles are read fresh on every exchange. */
    @Column(nullable = false, length = 150)
    private String userEmail;

    @Column(nullable = false)
    private Instant issuedAt;

    @Column(nullable = false)
    private Instant expiresAt;

    /** Null while the token is still good. Set once, and never unset. */
    private Instant revokedAt;

    public boolean isUsable(Instant now) {
        return revokedAt == null && expiresAt.isAfter(now);
    }
}
