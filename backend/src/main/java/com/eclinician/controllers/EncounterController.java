package com.eclinician.controllers;

import com.eclinician.domains.dtos.request.EncounterRequest;
import com.eclinician.domains.dtos.response.EncounterResponse;
import com.eclinician.domains.dtos.response.SummaryResponse;
import com.eclinician.security.CurrentTenant;
import com.eclinician.security.CurrentUserName;
import com.eclinician.services.EncounterService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/encounters")
public class EncounterController {
    private final EncounterService service;

    public EncounterController(EncounterService service) {
        this.service = service;
    }

    @PreAuthorize("hasAnyRole('CLINICIAN', 'ADMINISTRATOR')")
    @GetMapping
    public List<EncounterResponse> list(@CurrentTenant String tenantId,
            @CurrentUserName String userName,
            @RequestParam(required = false) UUID patientId,
            Authentication authentication) {
        boolean clinician = authentication.getAuthorities().stream()
                .anyMatch(authority -> authority.getAuthority().equals("ROLE_CLINICIAN"));
        return service.list(tenantId, patientId, clinician ? userName : null);
    }

    @PreAuthorize("hasAnyRole('CLINICIAN', 'ADMINISTRATOR')")
    @GetMapping("/{id}")
    public EncounterResponse get(@CurrentTenant String tenantId,
            @PathVariable UUID id) {
        return service.get(tenantId, id);
    }

    @PreAuthorize("hasRole('CLINICIAN')")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public EncounterResponse create(@CurrentTenant String tenantId,
            @CurrentUserName String clinicianName,
            @Valid @RequestBody EncounterRequest request) {
        return service.save(tenantId, clinicianName, null, request);
    }

    @PreAuthorize("hasRole('CLINICIAN')")
    @PutMapping("/{id}")
    public EncounterResponse update(@CurrentTenant String tenantId,
            @CurrentUserName String clinicianName,
            @PathVariable UUID id, @Valid @RequestBody EncounterRequest request) {
        return service.save(tenantId, clinicianName, id, request);
    }

    /**
     * Drafts the visit summary from the notes as sent, and returns the text alone.
     *
     * <p>No id, and no {@code @Valid}: this writes nothing, so it needs neither a saved
     * encounter nor a patient to hang it on. The clinician gets a paragraph back into an
     * editable field, and saving the note is what commits it.
     */
    @PreAuthorize("hasRole('CLINICIAN')")
    @PostMapping("/summary")
    public SummaryResponse draftSummary(@RequestBody EncounterRequest request) {
        return service.draftSummary(request);
    }

    /** Sends the patient for the tests already listed, without closing the visit. */
    @PreAuthorize("hasRole('CLINICIAN')")
    @PostMapping("/{id}/lab")
    public EncounterResponse sendToLab(@CurrentTenant String tenantId,
            @PathVariable UUID id) {
        return service.sendToLab(tenantId, id);
    }

    @PreAuthorize("hasRole('CLINICIAN')")
    @PostMapping("/{id}/finalize")
    public EncounterResponse finalizeEncounter(@CurrentTenant String tenantId,
            @PathVariable UUID id) {
        return service.finalizeEncounter(tenantId, id);
    }
}
