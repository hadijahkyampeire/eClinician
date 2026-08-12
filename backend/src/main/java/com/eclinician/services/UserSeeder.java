package com.eclinician.services;

import com.eclinician.domains.entities.AppUser;
import com.eclinician.domains.enums.UserRole;
import com.eclinician.repositories.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * Creates the demo staff accounts on startup so the app can be logged into. Every one
 * of them shares a single password, set by DEMO_PASSWORD — fine for a demo, and the
 * reason real deployments would seed nothing at all.
 */
@Component
public class UserSeeder implements CommandLineRunner {

    // Matches the tenant PatientSeeder uses.
    private static final String TENANT = "sample-hospital";

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
        add("Amina Okello", "admin@stmarys.eclinician.com", UserRole.ADMINISTRATOR, TENANT, false);
        add("Dr. Sarah Jenkins", "sjenkins@stmarys.eclinician.com", UserRole.CLINICIAN, TENANT, false);
        add("Grace Nakato", "reception@stmarys.eclinician.com", UserRole.RECEPTIONIST, TENANT, false);
        add("John Etyang", "pharmacy@stmarys.eclinician.com", UserRole.PHARMACIST, TENANT, false);
        add("Peter Ssali", "lab@stmarys.eclinician.com", UserRole.LAB_TECHNICIAN, TENANT, false);
        // No tenant: the platform admin onboards hospitals, and reads no clinical data.
        add("Hadijah K.", "root@eclinician.com", UserRole.ADMINISTRATOR, null, true);
    }

    private void add(String name, String email, UserRole role, String tenantId, boolean platform) {
        if (users.existsByEmailIgnoreCase(email)) return;
        AppUser user = new AppUser();
        user.setName(name);
        user.setEmail(email);
        user.setPasswordHash(passwords.encode(password));
        user.setRole(role);
        user.setTenantId(tenantId);
        user.setPlatformAdmin(platform);
        users.save(user);
    }
}
