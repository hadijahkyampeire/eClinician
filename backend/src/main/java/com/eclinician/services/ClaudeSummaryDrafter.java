package com.eclinician.services;

import com.anthropic.client.AnthropicClient;
import com.anthropic.client.okhttp.AnthropicOkHttpClient;
import com.anthropic.errors.AnthropicServiceException;
import com.anthropic.errors.RateLimitException;
import com.anthropic.models.messages.Message;
import com.anthropic.models.messages.MessageCreateParams;
import com.anthropic.models.messages.OutputConfig;
import com.eclinician.web.ServiceUnavailableException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/** Claude, through the official Anthropic SDK. */
@Component
public class ClaudeSummaryDrafter implements SummaryDrafter {

    private static final Logger log = LoggerFactory.getLogger(ClaudeSummaryDrafter.class);

    private final AnthropicClient client;
    private final String model;

    public ClaudeSummaryDrafter(@Value("${app.ai.anthropic.api-key:}") String apiKey,
            @Value("${app.ai.anthropic.model:claude-opus-5}") String model) {
        this.model = model;
        this.client = apiKey == null || apiKey.isBlank() ? null
                : AnthropicOkHttpClient.builder().apiKey(apiKey).build();
    }

    @Override
    public String name() {
        return "Claude (" + model + ")";
    }

    @Override
    public boolean isConfigured() {
        return client != null;
    }

    @Override
    public String draft(String systemPrompt, String notes) {
        try {
            Message reply = client.messages().create(MessageCreateParams.builder()
                    .model(model)
                    .maxTokens(1024L)
                    .system(systemPrompt)
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
}
