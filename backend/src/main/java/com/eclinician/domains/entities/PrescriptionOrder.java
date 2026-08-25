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

    /** What the clinician prescribed, as they wrote it. Never overwritten. */
    @Column(nullable = false, length = 500)
    private String medication;

    /**
     * What the pharmacist actually handed over. Usually the same medicine; sometimes an
     * equivalent, when the prescribed one is out of stock and the clinician has agreed to
     * the swap over the phone. Kept apart from {@link #medication} so the record shows
     * both — what was ordered and what the patient walked out with.
     *
     * <p>Null until the medicine is dispensed.
     */
    @Column(length = 500)
    private String dispensedMedication;

    /** How much went out, for the day the pharmacy asks what it is running low on. */
    private Integer quantityDispensed;

    /** What that quantity counts — tablets, bottles, sachets. */
    @Column(length = 30)
    private String dispenseUnit;

    /**
     * What is inside each one, when the unit is a container rather than a dose: a bottle
     * of syrup is "1 bottle" and also "100 ml", and neither number is the whole fact.
     * The count is what the shelf loses; this is what the patient actually gets.
     *
     * <p>Empty for things that are their own measure — 15 tablets need no pack size.
     */
    @Column(length = 40)
    private String packSize;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PrescriptionStatus status;

    @Column(length = 150)
    private String dispensedBy;

    private Instant dispensedAt;

    /**
     * The pharmacist's note: why it was unavailable, why a substitute was given, or that
     * the patient must get the rest of the course from another pharmacy.
     */
    @Column(length = 500)
    private String notes;

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
