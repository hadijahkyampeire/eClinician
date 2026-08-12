package com.eclinician.domains.entities;

import com.eclinician.domains.enums.LabStatus;
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
 * One requested test from one visit. The clinician writes a free-text block of lab
 * requests on the encounter; finalizing it splits that block into a row per line so
 * the lab can work each test independently.
 */
@Entity
@Table(name = "lab_orders")
@Getter
@Setter
public class LabOrder {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String tenantId;

    /** Denormalized from the encounter so the queue can show a name without a join. */
    @Column(nullable = false)
    private UUID patientId;

    /** The visit this test was requested on. */
    @Column(nullable = false)
    private UUID encounterId;

    @Column(nullable = false, length = 500)
    private String testName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private LabStatus status;

    /** What the analyser said. Free text — a structured result model is a later module. */
    @Column(length = 2000)
    private String result;

    @Column(length = 150)
    private String resultedBy;

    private Instant resultedAt;

    /** Why it was cancelled, or a caveat on the result. */
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
