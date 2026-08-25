package com.eclinician.services;

import com.eclinician.domains.entities.ClinicianAvailability;
import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * The rota a clinician starts with: the clinic's three shifts, every day of the week.
 *
 * <p>A doctor used to begin with nothing published, and reception only ever sees clinicians
 * whose shift covers the time being booked — so a newly added doctor was invisible until
 * they went and filled in their own availability. Being bookable is the sensible default;
 * a clinician marks themselves unavailable by removing shifts, not by adding them.
 *
 * <p>The last shift ends at 23:59 rather than 00:00 because a shift is matched with
 * {@code startTime <= t and endTime > t}, and midnight as an end time is numerically before
 * its own start — the shift would never match anything.
 */
final class DefaultRota {

    /**
     * The last minute of the day, as an end time.
     *
     * <p>A shift matches on {@code start <= t < end}, so an end of 00:00 sorts before its
     * own start and matches nothing, and an end of 23:59 leaves the 23:59 minute itself
     * uncovered. 23:59:59 closes the day with no gap a booking can fall into.
     */
    static final LocalTime END_OF_DAY = LocalTime.of(23, 59, 59);

    /** The clinic day, in four — round the clock, until a clinician takes hours off. */
    static final List<LocalTime[]> SHIFTS = List.of(
            new LocalTime[] {LocalTime.MIDNIGHT, LocalTime.of(8, 0)},
            new LocalTime[] {LocalTime.of(8, 0), LocalTime.of(14, 0)},
            new LocalTime[] {LocalTime.of(14, 0), LocalTime.of(20, 0)},
            new LocalTime[] {LocalTime.of(20, 0), END_OF_DAY});

    /** Until someone says otherwise, every clinician is a consulting room. */
    static final String DEFAULT_ROOM = "Consulting room";

    private DefaultRota() {}

    static List<ClinicianAvailability> forClinician(String tenantId, UUID clinicianId,
            String room) {
        List<ClinicianAvailability> rota = new ArrayList<>();
        for (DayOfWeek day : DayOfWeek.values()) {
            for (LocalTime[] shift : SHIFTS) {
                ClinicianAvailability value = new ClinicianAvailability();
                value.setTenantId(tenantId);
                value.setClinicianId(clinicianId);
                value.setDayOfWeek(day);
                value.setStartTime(shift[0]);
                value.setEndTime(shift[1]);
                value.setRoom(room == null || room.isBlank() ? DEFAULT_ROOM : room.trim());
                rota.add(value);
            }
        }
        return rota;
    }
}
