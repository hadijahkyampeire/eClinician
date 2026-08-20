package com.eclinician;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.eclinician.domains.entities.Encounter;
import com.eclinician.services.ClinicalSummaryService;
import com.eclinician.services.SummaryDrafter;
import com.eclinician.web.ConflictException;
import com.eclinician.web.ServiceUnavailableException;
import java.util.List;
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
    @Autowired List<SummaryDrafter> drafters;

    @Test
    void withoutAnApiKeyTheFeatureReportsItselfOffRatherThanFailing() {
        assertThat(summaries.isAvailable()).isFalse();
        assertThat(summaries.providerName()).isEqualTo("none");

        assertThatThrownBy(() -> summaries.draftFor(documented()))
                .isInstanceOf(ServiceUnavailableException.class)
                .hasMessageContaining("OPENAI_API_KEY");
    }

    /** Either vendor can answer; a key is the only thing that decides which. */
    @Test
    void aDrafterIsChosenByWhicheverKeyIsConfigured() {
        assertThat(drafters).extracting(SummaryDrafter::name)
                .anySatisfy(name -> assertThat(name).startsWith("OpenAI"))
                .anySatisfy(name -> assertThat(name).startsWith("Claude"));
        assertThat(drafters).noneMatch(SummaryDrafter::isConfigured);
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
