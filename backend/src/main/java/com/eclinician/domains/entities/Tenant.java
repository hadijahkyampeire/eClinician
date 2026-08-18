package com.eclinician.domains.entities;

import com.eclinician.domains.enums.ClinicModule;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import lombok.Getter;
import lombok.Setter;

/**
 * A hospital on the platform. Until now the tenant was only a string carried on every
 * row; this is the row that string refers to, which is what lets the platform
 * administrator onboard a hospital and decide which modules it has bought.
 */
@Entity
@Table(name = "tenants")
@Getter
@Setter
public class Tenant {

    /** The slug that appears in every other table's {@code tenant_id}. */
    @Id
    @Column(length = 60)
    private String id;

    @Column(nullable = false, length = 150)
    private String name;

    @Column(nullable = false, length = 7)
    private String primaryColor;

    /** Comma-separated {@link ClinicModule} names — a subscription, not a relationship. */
    @Column(nullable = false, length = 255)
    private String modules;

    /** A suspended hospital keeps its data; nobody there can sign in. */
    @Column(nullable = false)
    private boolean active = true;

    private Instant createdAt;

    @PrePersist
    void onCreate() {
        createdAt = Instant.now();
    }

    public List<ClinicModule> moduleList() {
        if (modules == null || modules.isBlank()) return List.of();
        return Arrays.stream(modules.split(",")).map(String::trim).filter(v -> !v.isEmpty())
                .map(ClinicModule::valueOf).toList();
    }

    public void setModuleList(List<ClinicModule> values) {
        this.modules = values.stream().map(Enum::name).reduce((a, b) -> a + "," + b).orElse("");
    }
}
