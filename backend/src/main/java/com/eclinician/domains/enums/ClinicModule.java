package com.eclinician.domains.enums;

import java.util.Arrays;
import java.util.List;

/**
 * A feature area of the product. The optional ones are a subscription the platform sells;
 * the core ones are what makes the software a hospital system at all — a front desk that
 * registers patients and books them in, and a clinician who writes what happened. Selling
 * a hospital a system without those would be selling it nothing, so they cannot be
 * switched off, and every hospital gets them whatever the console was told.
 */
public enum ClinicModule {
    PATIENTS(true),
    APPOINTMENTS(true),
    RECORDS(true),
    PHARMACY(false),
    LABORATORY(false);

    private final boolean core;

    ClinicModule(boolean core) {
        this.core = core;
    }

    /** True when no subscription can remove it. */
    public boolean isCore() {
        return core;
    }

    /** What the frontend calls this module in its navigation table. */
    public String key() {
        return name().toLowerCase();
    }

    /** The chosen modules plus the core ones, deduplicated and in declaration order. */
    public static List<ClinicModule> withCore(List<ClinicModule> chosen) {
        return Arrays.stream(values())
                .filter(module -> module.core || (chosen != null && chosen.contains(module)))
                .toList();
    }
}
