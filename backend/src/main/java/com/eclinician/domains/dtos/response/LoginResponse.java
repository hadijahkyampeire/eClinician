package com.eclinician.domains.dtos.response;

/**
 * Everything the frontend needs to build its session. The tenant is reported back for
 * display only — the copy that matters is the one signed inside the token — and its
 * branding and modules now come from the tenants table rather than the browser.
 *
 * <p>Two tokens come back. {@code token} is the short-lived one every call carries;
 * {@code refreshToken} is the one the browser spends to be given another, which is what
 * lets an expiring session be continued without asking for the password again.
 */
public record LoginResponse(
        String token,
        String refreshToken,
        long expiresInSeconds,
        String name,
        String email,
        String role,
        String profileImage,
        String tenantId,
        boolean platformAdmin,
        TenantResponse tenant) {}
