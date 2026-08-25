package com.eclinician.domains.entities;

import com.eclinician.domains.enums.EncounterStatus;
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
@Table(name = "encounters")
@Getter
@Setter
public class Encounter {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String tenantId;
    @Column(nullable = false)
    private UUID patientId;
    @Column(nullable = false, unique = true)
    private UUID appointmentId;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private EncounterStatus status;
    @Column(nullable = false, length = 150)
    private String clinicianName;
    @Column(length = 500)
    private String chiefComplaint;
    private String bloodPressure;
    private Double temperatureCelsius;
    private Integer pulseBpm;
    private Double weightKg;
    @Column(columnDefinition = "TEXT")
    private String symptoms;
    @Column(columnDefinition = "TEXT")
    private String examinationNotes;
    @Column(columnDefinition = "TEXT")
    private String diagnosis;
    @Column(columnDefinition = "TEXT")
    private String treatmentPlan;
    @Column(columnDefinition = "TEXT")
    private String prescriptions;
    @Column(columnDefinition = "TEXT")
    private String labRequests;
    /** Drafted from the notes above, then edited and owned by the clinician. */
    @Column(columnDefinition = "TEXT")
    private String visitSummary;
    private Instant finalizedAt;
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
