package com.eclinician.services;

/**
 * The external service that drafts a visit summary. The consultation VOPC drew one box
 * called {@code LLMService}; this is that box, kept as an interface because which vendor
 * sits behind it is a deployment decision, not a clinical one.
 *
 * <p>Implementations receive only the notes the clinician already wrote, and return prose.
 * Neither the encounter nor the database is visible from here.
 */
public interface SummaryDrafter {

    /** What to call this drafter in logs and in the API's error messages. */
    String name();

    /** Whether a key was supplied for it. An unconfigured drafter is simply not chosen. */
    boolean isConfigured();

    String draft(String systemPrompt, String notes);
}
