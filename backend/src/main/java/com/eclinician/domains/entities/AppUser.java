package com.eclinician.domains.entities;

import com.eclinician.domains.enums.UserRole;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

/**
 * A staff account. The tenant lives here rather than in a request header — logging in
 * is the only place a tenant is chosen, and from then on it travels inside a signed
 * token the browser cannot edit.
 */
@Entity
@Table(name = "app_users")
@Getter
@Setter
public class AppUser {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    /** Null only for the platform admin, who belongs to no single hospital. */
    private String tenantId;

    @Column(nullable = false, length = 150)
    private String name;

    /** Clinical discipline shown when reception assigns an appointment. */
    @Column(length = 100)
    private String specialty;

    @Column(nullable = false, unique = true, length = 200)
    private String email;

    /** Small self-service avatar stored as a validated image data URL. */
    @Column(columnDefinition = "text")
    private String profileImage;

    /** BCrypt. The plain password is never stored or logged. */
    @Column(nullable = false, length = 100)
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private UserRole role;

    @Column(nullable = false)
    private boolean platformAdmin;

    /**
     * Deactivated accounts keep their history but can no longer sign in.
     *
     * <p>The explicit default matters: without it, Hibernate's {@code ddl-auto=update}
     * cannot add a NOT NULL column to a table that already holds rows, and every
     * existing account would be locked out. Exactly the sort of thing Flyway exists for.
     */
    @Column(nullable = false, columnDefinition = "boolean not null default true")
    private boolean active = true;

    private Instant createdAt;

    @PrePersist
    void onCreate() {
        createdAt = Instant.now();
    }
}
