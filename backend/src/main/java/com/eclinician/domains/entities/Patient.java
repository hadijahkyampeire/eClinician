package com.eclinician.domains.entities;

import com.eclinician.domains.enums.PatientCareStatus;
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
import java.time.LocalDate;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

/** A patient record. Always scoped to a tenant (hospital). */
@Entity
@Table(name = "patients")
@Getter
@Setter
public class Patient {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String tenantId;

    @Column(length = 100)
    private String firstName;

    @Column(length = 100)
    private String lastName;

    private LocalDate dateOfBirth;
    private String sex;
    private String phone;

    @Column(length = 254)
    private String email;

    /** Country-neutral identifier: national ID, passport, alien ID, etc. */
    @Column(length = 100)
    private String nationalId;

    /** Existing "address" column is retained as the street/address line. */
    @Column(name = "address", length = 255)
    private String addressLine;

    @Column(length = 100)
    private String city;

    @Column(length = 100)
    private String district;

    @Column(length = 100)
    private String stateProvince;

    @Column(length = 2)
    private String country;

    @Enumerated(EnumType.STRING)
    @Column(length = 30)
    private PatientCareStatus activeCareStatus;

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
