package com.eclinician.services;

import com.eclinician.domains.entities.AppUser;
import com.eclinician.domains.entities.ClinicianAvailability;
import com.eclinician.repositories.ClinicianAvailabilityRepository;
import com.eclinician.repositories.UserRepository;
import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.Map;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

/** Gives the demo specialists a published Monday-Friday rota. */
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

    private void seedWeek(AppUser clinician, String room) {
        if (availability.existsByTenantIdAndClinicianId(TENANT, clinician.getId())) return;
        for (DayOfWeek day : new DayOfWeek[] {DayOfWeek.MONDAY, DayOfWeek.TUESDAY,
                DayOfWeek.WEDNESDAY, DayOfWeek.THURSDAY, DayOfWeek.FRIDAY}) {
            ClinicianAvailability shift = new ClinicianAvailability();
            shift.setTenantId(TENANT);
            shift.setClinicianId(clinician.getId());
            shift.setDayOfWeek(day);
            shift.setStartTime(LocalTime.of(8, 0));
            shift.setEndTime(LocalTime.of(17, 0));
            shift.setRoom(room);
            availability.save(shift);
        }
    }
}
