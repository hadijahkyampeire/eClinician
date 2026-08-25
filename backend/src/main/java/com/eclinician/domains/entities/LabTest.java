package com.eclinician.domains.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

/** One test a clinician can request by name. Reference data, like {@link Medication}. */
@Entity
@Table(name = "lab_tests")
@Getter
@Setter
public class LabTest {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, length = 150)
    private String name;

    /** Haematology, Microbiology, Chemistry — how a lab groups its bench. */
    @Column(length = 60)
    private String category;

    /** What has to be collected: blood, urine, stool, swab. */
    @Column(length = 40)
    private String specimen;

    @Column(nullable = false)
    private boolean active = true;
}
