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

/**
 * One medicine a clinician can pick rather than type.
 *
 * <p>Deliberately not tenant-scoped: this is a reference list of what medicines *are*, the
 * same everywhere, not a record of what any one hospital has on its shelves. A per-hospital
 * formulary — this medicine, this stock, this price — is a different table and a later one.
 */
@Entity
@Table(name = "medications")
@Getter
@Setter
public class Medication {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    /** The generic name, which is what a prescription should carry. */
    @Column(nullable = false, length = 150)
    private String name;

    /** "500mg", "125mg/5ml". Empty where the form has no single strength. */
    @Column(length = 60)
    private String strength;

    /** Tablet, Capsule, Suspension, Injection — what it physically is. */
    @Column(length = 40)
    private String form;

    /** Groups the picker, so a clinician can scan by what they are treating. */
    @Column(length = 60)
    private String category;

    @Column(nullable = false)
    private boolean active = true;

    /** What the clinician reads and what lands on the prescription line. */
    public String label() {
        StringBuilder text = new StringBuilder(name);
        if (strength != null && !strength.isBlank()) text.append(' ').append(strength);
        if (form != null && !form.isBlank()) text.append(' ').append(form.toLowerCase());
        return text.toString();
    }
}
