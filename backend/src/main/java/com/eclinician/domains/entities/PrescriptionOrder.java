package com.eclinician.domains.entities;

import com.eclinician.domains.enums.PrescriptionStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

/**
 * One prescribed medicine from one visit. The clinician writes a free-text block
 * of prescriptions on the encounter; finalizing it splits that block into a row
 * per line so the pharmacy can dispense each medicine independently.
 */
@Entity
@Table(name = "prescription_orders")
@Getter
@Setter
public class PrescriptionOrder {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String tenantId;

    /** Denormalized from the encounter so the queue can show a name without a join. */
    @Column(nullable = false)
    private UUID patientId;

    /** The visit this medicine was prescribed on. */
    @Column(nullable = false)
    private UUID encounterId;

    @Column(nullable = false, length = 500)
    private String medication;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PrescriptionStatus status;

    @Column(length = 150)
    private String dispensedBy;

    private Instant dispensedAt;

    /** Why it was unavailable, or what was substituted. */
    @Column(length = 500)
    private String notes;

    private Instant createdAt;
    private Instant updatedAt;

    @PrePersist
    void onCreate() {
        createdAt = updatedAt = Instant.now();
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}
