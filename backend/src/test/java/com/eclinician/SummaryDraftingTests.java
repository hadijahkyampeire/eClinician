package com.eclinician;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.eclinician.domains.entities.Encounter;
import com.eclinician.services.ClinicalSummaryService;
import com.eclinician.web.ConflictException;
import com.eclinician.web.ServiceUnavailableException;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

/**
 * The summarizer is an external service, so these tests cover the two things that must
 * hold without one: the notes it would send, and what happens when no key is configured.
 * Nothing here calls the Claude API.
 */
@SpringBootTest
class SummaryDraftingTests {

    @Autowired ClinicalSummaryService summaries;

    @Test
    void withoutAnApiKeyTheFeatureReportsItselfOffRatherThanFailing() {
        assertThat(summaries.isAvailable()).isFalse();

        assertThatThrownBy(() -> summaries.draftFor(documented()))
                .isInstanceOf(ServiceUnavailableException.class)
                .hasMessageContaining("ANTHROPIC_API_KEY");
    }

    @Test
    void anEmptyEncounterIsRefusedBeforeAnythingIsSent() {
        assertThatThrownBy(() -> summaries.draftFor(new Encounter()))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("Write the visit up");
    }

    private Encounter documented() {
        Encounter encounter = new Encounter();
        encounter.setChiefComplaint("Fever for three days");
        encounter.setDiagnosis("Malaria");
        encounter.setTreatmentPlan("Coartem, review in three days");
        return encounter;
    }
}
