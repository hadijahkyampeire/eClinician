package com.eclinician.domains.dtos;

import java.util.List;
import java.util.UUID;

/**
 * One person at the pharmacy counter, with what they are waiting for.
 *
 * The queue used to be a list of medicines, so three boxes for one patient read as three
 * people. A pharmacist serves a person, not a line item.
 */
public record CounterPatient(
        UUID patientId,
        String patientName,
        /** Everything from the visit that sent them here, dispensed or not. */
        List<PrescriptionResponse> medicines,
        /** Nothing left waiting to be handed over — they are free to go. */
        boolean ready) {}
