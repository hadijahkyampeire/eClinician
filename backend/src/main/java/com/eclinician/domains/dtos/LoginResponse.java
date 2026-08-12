package com.eclinician.domains.dtos;

/**
 * Everything the frontend needs to build its session. The tenant is reported back for
 * display only — the copy that matters is the one signed inside the token.
 */
public record LoginResponse(
        String token,
        long expiresInSeconds,
        String name,
        String email,
        String role,
        String tenantId,
        boolean platformAdmin) {}
