package com.eclinician.services;

import com.eclinician.exceptions.ServiceUnavailableException;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;

/**
 * OpenAI's chat completions, called over plain HTTP rather than through a vendor SDK —
 * one POST with a JSON body is less to carry than a dependency, and it keeps this class
 * readable next to {@link ClaudeSummaryDrafter}.
 */
@Component
public class OpenAiSummaryDrafter implements SummaryDrafter {

    private final String apiKey;
    private final String model;
    /** Configurable so an OpenAI-compatible endpoint — or a stub — can stand in. */
    private final String endpoint;
    private final RestClient http;

    public OpenAiSummaryDrafter(@Value("${app.ai.openai.api-key:}") String apiKey,
            @Value("${app.ai.openai.model:gpt-4o-mini}") String model,
            @Value("${app.ai.openai.endpoint:https://api.openai.com/v1/chat/completions}")
            String endpoint) {
        this.apiKey = apiKey == null ? "" : apiKey.trim();
        this.model = model;
        this.endpoint = endpoint;
        this.http = RestClient.create();
    }

    @Override
    public String name() {
        return "OpenAI (" + model + ")";
    }

    @Override
    public boolean isConfigured() {
        return !apiKey.isBlank();
    }

    @Override
    public String draft(String systemPrompt, String notes) {
        Map<String, Object> body = Map.of(
                "model", model,
                "max_tokens", 1024,
                "messages", List.of(
                        Map.of("role", "system", "content", systemPrompt),
                        Map.of("role", "user", "content", notes)));
        try {
            OpenAiReply reply = http.post()
                    .uri(endpoint)
                    .header("Authorization", "Bearer " + apiKey)
                    .body(body)
                    .retrieve()
                    .onStatus(HttpStatusCode::isError, (request, response) -> {
                        throw new ServiceUnavailableException(explain(
                                response.getStatusCode().value()));
                    })
                    .body(OpenAiReply.class);

            String text = reply == null || reply.choices() == null || reply.choices().isEmpty()
                    ? null : reply.choices().get(0).message().content();
            if (text == null || text.isBlank()) {
                throw new ServiceUnavailableException("The summarizer returned nothing to draft from");
            }
            return text.trim();
        } catch (ResourceAccessException ex) {
            throw new ServiceUnavailableException("The summarizer could not be reached");
        }
    }

    /**
     * What actually went wrong, in words worth reading mid-consultation. 429 covers both
     * "too fast" and "no credit left", which are different problems for whoever set the
     * key up, so the message names both rather than guessing.
     */
    private static String explain(int status) {
        return switch (status) {
            case 401, 403 -> "The summarizer rejected the API key — check OPENAI_API_KEY";
            case 404 -> "The summarizer does not recognise that model — check OPENAI_MODEL";
            case 429 -> "The summarizer is out of credit or rate limited — check the "
                    + "account's billing, then try again";
            default -> "The summarizer could not be reached (HTTP " + status + ")";
        };
    }

    /** Only the part of the response this needs; the rest is ignored on purpose. */
    record OpenAiReply(List<Choice> choices) {
        record Choice(Message message) {}
        record Message(String content) {}
    }
}
