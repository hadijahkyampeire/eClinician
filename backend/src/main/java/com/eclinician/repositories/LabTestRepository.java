package com.eclinician.repositories;

import com.eclinician.domains.entities.LabTest;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

/** Reference data, so no tenant scope — see {@link LabTest}. */
public interface LabTestRepository extends JpaRepository<LabTest, UUID> {

    List<LabTest> findByActiveTrueOrderByNameAsc();
}
