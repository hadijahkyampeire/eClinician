package com.eclinician.patient;

import java.time.LocalDate;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

/** Adds a few demo patients on startup so the app isn't empty in dev. */
@Component
public class PatientSeeder implements CommandLineRunner {

    // Matches the frontend's sample tenant (see demoUsers.ts).
    private static final String TENANT = "sample-hospital";

    private final PatientRepository repo;

    PatientSeeder(PatientRepository repo) {
        this.repo = repo;
    }

    @Override
    public void run(String... args) {
        if (repo.existsByTenantId(TENANT)) return;
        add("Mary", "Nakimuli", LocalDate.of(1990, 4, 12), "Female", "0700111222");
        add("James", "Okwir", LocalDate.of(1985, 9, 3), "Male", "0700333444");
        add("Sarah", "Auma", LocalDate.of(2001, 1, 25), "Female", "0700555666");
    }

    private void add(String first, String last, LocalDate dob, String sex, String phone) {
        Patient p = new Patient();
        p.setTenantId(TENANT);
        p.setFirstName(first);
        p.setLastName(last);
        p.setDateOfBirth(dob);
        p.setSex(sex);
        p.setPhone(phone);
        repo.save(p);
    }
}
