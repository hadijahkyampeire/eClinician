package com.eclinician.services;

import com.eclinician.domains.entities.AppUser;
import com.eclinician.repositories.ClinicianAvailabilityRepository;
import com.eclinician.repositories.UserRepository;
import java.util.Map;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

/** Gives the demo specialists the clinic's standard rota, each in their own room. */
@Component
@Order(3)
public class ClinicianAvailabilitySeeder implements CommandLineRunner {
    private static final String TENANT = "hk-clinics";
    private static final Map<String, String> ROOMS = Map.of(
            "hkdoctor@hkclinics.com", "Room A",
            "hkdentist@hkclinics.com", "Room B",
            "hkpediatrician@hkclinics.com", "Room C",
            "hkobgyn@hkclinics.com", "Room D",
            "hkoptometrist@hkclinics.com", "Room E");

    private final UserRepository users;
    private final ClinicianAvailabilityRepository availability;

    public ClinicianAvailabilitySeeder(
            UserRepository users, ClinicianAvailabilityRepository availability) {
        this.users = users;
        this.availability = availability;
    }

    @Override
    public void run(String... args) {
        ROOMS.forEach((email, room) -> users.findByEmailIgnoreCase(email)
                .filter(user -> TENANT.equals(user.getTenantId()))
                .ifPresent(user -> seedWeek(user, room)));
    }

    /** The same three shifts every other clinician gets — only the room differs. */
    private void seedWeek(AppUser clinician, String room) {
        if (availability.existsByTenantIdAndClinicianId(TENANT, clinician.getId())) return;
        availability.saveAll(DefaultRota.forClinician(TENANT, clinician.getId(), room));
    }
}
