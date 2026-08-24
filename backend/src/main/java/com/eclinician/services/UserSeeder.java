package com.eclinician.services;

import com.eclinician.domains.entities.AppUser;
import com.eclinician.domains.enums.UserRole;
import com.eclinician.repositories.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

/**
 * Creates the demo staff accounts on startup so the app can be logged into. Every one
 * of them shares a single password, set by DEMO_PASSWORD — fine for a demo, and the
 * reason real deployments would seed nothing at all.
 */
@Component
@Order(2)
public class UserSeeder implements CommandLineRunner {

    // The demo clinic, seeded by TenantSeeder before this runs.
    private static final String TENANT = "hk-clinics";

    private final UserRepository users;
    private final PasswordEncoder passwords;
    private final String password;

    public UserSeeder(UserRepository users, PasswordEncoder passwords,
            @Value("${app.demo-password:demo1234}") String password) {
        this.users = users;
        this.passwords = passwords;
        this.password = password;
    }

    @Override
    public void run(String... args) {
        add("Amina Okello", "hkadmin@hkclinics.com", UserRole.ADMINISTRATOR, null, TENANT, false);
        add("Dr. Sarah Jenkins", "hkdoctor@hkclinics.com", UserRole.CLINICIAN,
                "General Practitioner", TENANT, false);
        add("Dr. Daniel Kato", "hkdentist@hkclinics.com", UserRole.CLINICIAN,
                "Dentist", TENANT, false);
        add("Dr. Miriam Atwine", "hkpediatrician@hkclinics.com", UserRole.CLINICIAN,
                "Pediatrician", TENANT, false);
        add("Dr. Joel Ssemanda", "hkoptometrist@hkclinics.com", UserRole.CLINICIAN,
                "Optometrist", TENANT, false);
        add("Grace Nakato", "hkreceptionist@hkclinics.com", UserRole.RECEPTIONIST, null, TENANT, false);
        add("John Etyang", "hkpharmacy@hkclinics.com", UserRole.PHARMACIST, null, TENANT, false);
        add("Peter Ssali", "hklabtech@hkclinics.com", UserRole.LAB_TECHNICIAN, null, TENANT, false);
        // No tenant: the platform admin onboards hospitals, and reads no clinical data.
        add("Hadijah K.", "root@eclinician.com", UserRole.ADMINISTRATOR, null, null, true);
    }

    private void add(String name, String email, UserRole role, String specialty,
            String tenantId, boolean platform) {
        AppUser existing = users.findByEmailIgnoreCase(email).orElse(null);
        if (existing != null) {
            if (role == UserRole.CLINICIAN && existing.getSpecialty() == null) {
                existing.setSpecialty(specialty);
                users.save(existing);
            }
            return;
        }
        AppUser user = new AppUser();
        user.setName(name);
        user.setEmail(email);
        user.setPasswordHash(passwords.encode(password));
        user.setRole(role);
        user.setSpecialty(specialty);
        user.setTenantId(tenantId);
        user.setPlatformAdmin(platform);
        users.save(user);
    }
}
