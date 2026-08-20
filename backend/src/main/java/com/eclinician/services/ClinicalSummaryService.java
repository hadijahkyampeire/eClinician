package com.eclinician.services;

import com.anthropic.client.AnthropicClient;
import com.anthropic.client.okhttp.AnthropicOkHttpClient;
import com.anthropic.errors.AnthropicServiceException;
import com.anthropic.errors.RateLimitException;
import com.anthropic.models.messages.Message;
import com.anthropic.models.messages.MessageCreateParams;
import com.anthropic.models.messages.OutputConfig;
import com.eclinician.domains.entities.Encounter;
import com.eclinician.web.ConflictException;
import com.eclinician.web.ServiceUnavailableException;
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

    private final AnthropicClient client;
    private final String model;

    public ClinicalSummaryService(@Value("${app.ai.api-key:}") String apiKey,
            @Value("${app.ai.model:claude-opus-5}") String model) {
        this.model = model;
        // No key is committed anywhere; without one the feature simply reports itself off.
        this.client = apiKey == null || apiKey.isBlank() ? null
                : AnthropicOkHttpClient.builder().apiKey(apiKey).build();
        if (this.client == null) {
            log.info("No ANTHROPIC_API_KEY set — visit-summary drafting is unavailable.");
        }
    }

    public boolean isAvailable() {
        return client != null;
    }

    public String draftFor(Encounter encounter) {
        // The caller's own mistake first: an empty encounter is worth saying so about
        // whether or not the summarizer is configured.
        String notes = notesOf(encounter);
        if (notes.isBlank()) {
            throw new ConflictException("Write the visit up before drafting a summary");
        }
        if (client == null) {
            throw new ServiceUnavailableException(
                    "Summary drafting is switched off: no ANTHROPIC_API_KEY is configured");
        }
        try {
            Message reply = client.messages().create(MessageCreateParams.builder()
                    .model(model)
                    .maxTokens(1024L)
                    .system(SYSTEM)
                    // Summarizing short notes: low effort keeps the clinician waiting seconds.
                    .outputConfig(OutputConfig.builder()
                            .effort(OutputConfig.Effort.LOW)
                            .build())
                    .addUserMessage(notes)
                    .build());
            return reply.content().stream()
                    .flatMap(block -> block.text().stream())
                    .map(text -> text.text())
                    .reduce((a, b) -> a + "\n" + b)
                    .orElseThrow(() -> new ServiceUnavailableException(
                            "The summarizer returned nothing to draft from"))
                    .trim();
        } catch (RateLimitException ex) {
            throw new ServiceUnavailableException(
                    "The summarizer is rate limited right now — try again in a moment");
        } catch (AnthropicServiceException ex) {
            log.warn("Summary drafting failed: {}", ex.getMessage());
            throw new ServiceUnavailableException("The summarizer could not be reached");
        }
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
