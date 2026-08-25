package com.eclinician.domains.entities;

import com.eclinician.domains.enums.AppointmentStatus;
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

@Entity
@Table(name = "appointments")
@Getter
@Setter
public class Appointment {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String tenantId;

    @Column(nullable = false)
    private UUID patientId;

    /** The clinician the visit is booked with. Null for a walk-in, taken by whoever is free. */
    private UUID doctorId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private AppointmentStatus status;

    @Column(nullable = false)
    private Instant scheduledAt;

    private Instant checkedInAt;
    /** When reception moved the arrived patient into the waiting room. */
    private Instant waitingAt;
    private Instant sessionStartedAt;
    private Instant completedAt;

    @Column(length = 500)
    private String reason;

    private Instant createdAt;
    private Instant updatedAt;

    @PrePersist
    void onCreate() {
        // Seeded demo history arrives carrying the timestamps of the visit it stands for,
        // so a row that says it was resulted in July is not also created today. Nothing a
        // client sends can reach these: no request DTO has a createdAt to set.
        if (createdAt == null) {
            createdAt = Instant.now();
        }
        if (updatedAt == null) {
            updatedAt = createdAt;
        }
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}
