package com.eclinician.domains.dtos.response;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * One patient's outstanding lab work, together.
 *
 * The queue was a flat list of tests, so two people needing a full blood count read as
 * two rows that looked identical and one wrong click filed a result against the wrong
 * person. A technician works through people, and each person's samples belong together.
 */
public record BenchPatient(
        UUID patientId,
        String patientName,
        /** Everything of theirs still to be answered, oldest request first. */
        List<LabOrderResponse> tests,
        /** When the first of these was asked for — how long they have been in the queue. */
        Instant waitingSince) {}
