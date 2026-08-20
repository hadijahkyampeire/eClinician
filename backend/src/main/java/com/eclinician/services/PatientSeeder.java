package com.eclinician.services;

import com.eclinician.domains.entities.Patient;
import com.eclinician.repositories.PatientRepository;
import java.time.LocalDate;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

/** Adds a few demo patients on startup so the app isn't empty in dev. */
@Component
public class PatientSeeder implements CommandLineRunner {

    // The demo clinic, seeded by TenantSeeder before this runs.
    private static final String TENANT = "hk-clinics";

    private final PatientRepository repo;

    public PatientSeeder(PatientRepository repo) {
        this.repo = repo;
    }

    @Override
    public void run(String... args) {
        if (repo.existsByTenantId(TENANT)) return;
        add(new DemoPatient(
                "Mary", "Nakimuli", LocalDate.of(1990, 4, 12), "Female",
                "+256700111222", "mary.nakimuli@example.com", "CF8900412AB3",
                "14 Kira Road", "Kampala", "Kampala", "Central Region", "UG"));
        add(new DemoPatient(
                "James", "Okwir", LocalDate.of(1985, 9, 3), "Male",
                "+256700333444", "james.okwir@example.com", "CM8509034CD5",
                "Plot 8, Main Street", "Gulu", "Gulu", "Northern Region", "UG"));
        add(new DemoPatient(
                "Sarah", "Auma", LocalDate.of(2001, 1, 25), "Female",
                "+256700555666", "sarah.auma@example.com", "CF0101256EF7",
                "22 Jinja Road", "Mbale", "Mbale", "Eastern Region", "UG"));
    }

    private void add(DemoPatient demo) {
        Patient p = new Patient();
        p.setTenantId(TENANT);
        p.setFirstName(demo.firstName());
        p.setLastName(demo.lastName());
        p.setDateOfBirth(demo.dateOfBirth());
        p.setSex(demo.sex());
        p.setPhone(demo.phone());
        p.setEmail(demo.email());
        p.setNationalId(demo.governmentId());
        p.setAddressLine(demo.addressLine());
        p.setCity(demo.city());
        p.setDistrict(demo.district());
        p.setStateProvince(demo.stateProvince());
        p.setCountry(demo.country());
        repo.save(p);
    }

    private record DemoPatient(
            String firstName,
            String lastName,
            LocalDate dateOfBirth,
            String sex,
            String phone,
            String email,
            String governmentId,
            String addressLine,
            String city,
            String district,
            String stateProvince,
            String country) {
    }
}
