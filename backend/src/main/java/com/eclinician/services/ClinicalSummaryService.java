package com.eclinician.services;

import com.eclinician.domains.entities.Encounter;
import com.eclinician.web.ConflictException;
import com.eclinician.web.ServiceUnavailableException;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * The external summarizer the consultation VOPC always had in it: it reads what the
 * clinician wrote and drafts the visit summary they would otherwise type twice.
 *
 * <p>The draft is never the record. It comes back into an editable field, the clinician
 * changes what they disagree with, and their name is what the encounter is signed with.
 *
 * <p>Which vendor answers is a deployment decision: whichever {@link SummaryDrafter} has
 * a key wins, and {@code app.ai.provider} names one explicitly. Neither key is committed,
 * and with no key at all the feature reports itself off rather than breaking a visit.
 */
@Service
public class ClinicalSummaryService {

    private static final Logger log = LoggerFactory.getLogger(ClinicalSummaryService.class);

    private static final String SYSTEM = """
            You draft the visit summary for a clinician in an outpatient clinic, from the
            notes they have just written.

            Write 3-5 sentences of plain clinical prose covering why the patient came, what
            was found, the diagnosis reached, and the plan. Then, if medicines or tests were
            ordered, add a final line listing them.

            Use only what the notes contain. Never add a diagnosis, a medicine, a dose or a
            finding that is not written there, and where the notes are thin, say less. If
            something important is missing, end with one short line beginning "Not recorded:".
            Write for the patient's own file, not for a chat: no greeting, no sign-off, and
            no offer to help further.
            """;

    private final SummaryDrafter drafter;

    public ClinicalSummaryService(List<SummaryDrafter> drafters,
            @Value("${app.ai.provider:auto}") String preference) {
        this.drafter = choose(drafters, preference).orElse(null);
        log.info(drafter == null
                ? "No summarizer key configured — visit-summary drafting is unavailable."
                : "Visit summaries will be drafted by " + drafter.name() + ".");
    }

    /**
     * {@code auto} takes whichever drafter is configured, preferring the cheaper one when
     * both are; naming a provider takes that one and only that one, so a deployment can
     * insist rather than depend on which key happens to be set.
     */
    private static Optional<SummaryDrafter> choose(List<SummaryDrafter> drafters, String preference) {
        String wanted = preference == null ? "auto" : preference.trim().toLowerCase();
        return drafters.stream()
                .filter(SummaryDrafter::isConfigured)
                .filter(candidate -> wanted.equals("auto")
                        || candidate.name().toLowerCase().startsWith(wanted))
                .min(Comparator.comparingInt(candidate ->
                        candidate instanceof OpenAiSummaryDrafter ? 0 : 1));
    }

    public boolean isAvailable() {
        return drafter != null;
    }

    /** Which service answers, for the settings screen and for the logs. */
    public String providerName() {
        return drafter == null ? "none" : drafter.name();
    }

    public String draftFor(Encounter encounter) {
        // The caller's own mistake first: an empty encounter is worth saying so about
        // whether or not a summarizer is configured.
        String notes = notesOf(encounter);
        if (notes.isBlank()) {
            throw new ConflictException("Write the visit up before drafting a summary");
        }
        if (drafter == null) {
            throw new ServiceUnavailableException("Summary drafting is switched off: "
                    + "set OPENAI_API_KEY or ANTHROPIC_API_KEY to turn it on");
        }
        return drafter.draft(SYSTEM, notes);
    }

    /** Only what the clinician actually recorded; empty fields are left out entirely. */
    private String notesOf(Encounter encounter) {
        StringBuilder notes = new StringBuilder();
        append(notes, "Chief complaint", encounter.getChiefComplaint());
        append(notes, "Symptoms", encounter.getSymptoms());
        append(notes, "Blood pressure", encounter.getBloodPressure());
        append(notes, "Temperature (C)", string(encounter.getTemperatureCelsius()));
        append(notes, "Pulse (bpm)", string(encounter.getPulseBpm()));
        append(notes, "Weight (kg)", string(encounter.getWeightKg()));
        append(notes, "Examination", encounter.getExaminationNotes());
        append(notes, "Diagnosis", encounter.getDiagnosis());
        append(notes, "Treatment plan", encounter.getTreatmentPlan());
        append(notes, "Prescribed", encounter.getPrescriptions());
        append(notes, "Tests requested", encounter.getLabRequests());
        return notes.toString().trim();
    }

    private static void append(StringBuilder notes, String label, String value) {
        if (value != null && !value.isBlank()) {
            notes.append(label).append(": ").append(value.trim()).append('\n');
        }
    }

    private static String string(Object value) {
        return value == null ? null : value.toString();
    }
}
