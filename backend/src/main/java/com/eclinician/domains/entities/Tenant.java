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

    /**
     * Where the hospital is, and how to reach it. All optional: a hospital onboarded
     * before this existed has none of it, and the console says so rather than pretending.
     */
    @Column(length = 255)
    private String addressLine;

    @Column(length = 100)
    private String city;

    /**
     * ISO 3166-2's name for the level below a country — a district in Uganda, a state in
     * the US, a province in Canada. One field for whichever this hospital has, so the
     * console can filter clinics anywhere in the world by the same column.
     */
    @Column(length = 100)
    private String subdivision;

    @Column(length = 20)
    private String postalCode;

    /** ISO 3166-1 alpha-2, upper case. The other filter. */
    @Column(length = 2)
    private String country;

    @Column(length = 30)
    private String phone;

    @Column(length = 254)
    private String email;

    /**
     * The clinic's own clock. A rota is written in wall-clock time — "the morning shift
     * is 08:00" — and that means 08:00 *there*. Matching it against the server's timezone
     * worked only while every hospital shared it; a clinic in Boston would otherwise find
     * its morning shift running at one in the morning.
     */
    @Column(nullable = false, length = 60)
    private String timeZone = "Africa/Kampala";

    /** A suspended hospital keeps its data; nobody there can sign in. */
    @Column(nullable = false)
    private boolean active = true;

    private Instant createdAt;

    @PrePersist
    void onCreate() {
        createdAt = Instant.now();
    }

    /** Falls back rather than throwing: a bad zone must not take a hospital offline. */
    public java.time.ZoneId zone() {
        try {
            return java.time.ZoneId.of(timeZone);
        } catch (RuntimeException invalid) {
            return java.time.ZoneId.of("Africa/Kampala");
        }
    }

    /**
     * Core modules are added back on the way out as well as on the way in, so a hospital
     * onboarded before they existed — or edited straight through the API — still has them.
     */
    public List<ClinicModule> moduleList() {
        if (modules == null || modules.isBlank()) return ClinicModule.withCore(List.of());
        return ClinicModule.withCore(Arrays.stream(modules.split(",")).map(String::trim)
                .filter(v -> !v.isEmpty()).map(ClinicModule::valueOf).toList());
    }

    public void setModuleList(List<ClinicModule> values) {
        this.modules = ClinicModule.withCore(values).stream().map(Enum::name)
                .reduce((a, b) -> a + "," + b).orElse("");
    }
}
