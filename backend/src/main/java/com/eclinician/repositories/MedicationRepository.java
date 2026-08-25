package com.eclinician.repositories;

import com.eclinician.domains.entities.Medication;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

/** Reference data, so no tenant scope — see {@link Medication}. */
public interface MedicationRepository extends JpaRepository<Medication, UUID> {

    List<Medication> findByActiveTrueOrderByNameAsc();
}
