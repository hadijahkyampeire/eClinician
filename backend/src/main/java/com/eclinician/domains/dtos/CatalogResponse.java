package com.eclinician.domains.dtos;

import com.eclinician.domains.entities.LabTest;
import com.eclinician.domains.entities.Medication;
import java.util.UUID;

/** The two reference lists a clinician picks orders from. */
public final class CatalogResponse {

    private CatalogResponse() {}

    /**
     * A medicine as the prescription form offers it. {@code label} is what goes onto the
     * prescription line, composed once here so every screen writes the same string.
     */
    public record MedicationOption(UUID id, String name, String strength, String form,
            String category, String label) {

        public static MedicationOption from(Medication value) {
            return new MedicationOption(value.getId(), value.getName(), value.getStrength(),
                    value.getForm(), value.getCategory(), value.label());
        }
    }

    public record LabTestOption(UUID id, String name, String category, String specimen) {

        public static LabTestOption from(LabTest value) {
            return new LabTestOption(value.getId(), value.getName(), value.getCategory(),
                    value.getSpecimen());
        }
    }
}
