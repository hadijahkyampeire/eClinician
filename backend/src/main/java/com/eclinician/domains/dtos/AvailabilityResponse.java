package com.eclinician.domains.dtos;

import com.eclinician.domains.entities.ClinicianAvailability;
import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.UUID;

public record AvailabilityResponse(
        UUID id, DayOfWeek dayOfWeek, LocalTime startTime, LocalTime endTime, String room) {
    public static AvailabilityResponse from(ClinicianAvailability value) {
        return new AvailabilityResponse(value.getId(), value.getDayOfWeek(),
                value.getStartTime(), value.getEndTime(), value.getRoom());
    }
}
