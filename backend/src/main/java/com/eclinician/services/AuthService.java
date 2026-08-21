package com.eclinician.services;

import com.eclinician.domains.dtos.LoginRequest;
import com.eclinician.domains.dtos.PasswordChangeRequest;
import com.eclinician.domains.dtos.LoginResponse;
import com.eclinician.domains.dtos.TenantResponse;
import com.eclinician.domains.entities.AppUser;
import com.eclinician.domains.entities.Tenant;
import com.eclinician.repositories.UserRepository;
import com.eclinician.web.ConflictException;
import java.time.Duration;
import java.time.Instant;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private final UserRepository users;
    private final PasswordEncoder passwords;
    private final JwtEncoder tokens;
    private final TenantService tenantService;
    private final RefreshTokenService refreshTokens;
    private final Duration ttl;

    public AuthService(UserRepository users, PasswordEncoder passwords, JwtEncoder tokens,
            TenantService tenantService, RefreshTokenService refreshTokens,
            @Value("${app.jwt.ttl-minutes:480}") long ttlMinutes) {
        this.users = users;
        this.passwords = passwords;
        this.tokens = tokens;
        this.tenantService = tenantService;
        this.refreshTokens = refreshTokens;
        this.ttl = Duration.ofMinutes(ttlMinutes);
    }

    public LoginResponse login(LoginRequest request) {
        AppUser user = users.findByEmailIgnoreCase(request.email().trim())
                .filter(AppUser::isActive)
                .filter(found -> passwords.matches(request.password(), found.getPasswordHash()))
                // One message for both a wrong email and a wrong password, so the response
                // cannot be used to discover which accounts exist.
                .orElseThrow(() -> new BadCredentialsException("Invalid email or password"));

        return session(user);
    }

    /**
     * Trades a refresh token for a new pair. The account is read again rather than
     * trusted from the old token, so someone deactivated — or a hospital suspended —
     * since signing in cannot renew their way past it.
     */
    public LoginResponse refresh(String refreshToken) {
        String email = refreshTokens.exchange(refreshToken);
        AppUser user = users.findByEmailIgnoreCase(email)
                .filter(AppUser::isActive)
                .orElseThrow(() -> new BadCredentialsException(
                        "Your session has ended. Please sign in again."));
        return session(user);
    }

    /** Signing out ends the refresh token too, so the browser cannot renew after it. */
    public void logout(String refreshToken) {
        if (refreshToken != null && !refreshToken.isBlank()) {
            refreshTokens.revoke(refreshToken);
        }
    }

    /** The one place a signed-in session is built, for login and for renewal alike. */
    private LoginResponse session(AppUser user) {
        Tenant tenant = tenantService.configFor(user.getTenantId()).orElse(null);
        // A suspended hospital keeps its data and its accounts; nobody there signs in.
        if (tenant != null && !tenant.isActive()) {
            throw new BadCredentialsException("This hospital's account is suspended");
        }

        return new LoginResponse(token(user), refreshTokens.issue(user.getEmail()),
                ttl.toSeconds(), user.getName(), user.getEmail(),
                user.getRole().label(), user.getTenantId(), user.isPlatformAdmin(),
                tenant == null ? null : TenantResponse.from(tenant));
    }

    /**
     * Self-service, so it takes the current password rather than trusting the session:
     * a token left open on a shared desk should not be enough to lock the owner out.
     */
    @Transactional
    public void changePassword(String email, PasswordChangeRequest request) {
        AppUser user = users.findByEmailIgnoreCase(email)
                .filter(AppUser::isActive)
                .orElseThrow(() -> new BadCredentialsException("Invalid email or password"));
        if (!passwords.matches(request.currentPassword(), user.getPasswordHash())) {
            throw new BadCredentialsException("Your current password is not correct");
        }
        if (passwords.matches(request.newPassword(), user.getPasswordHash())) {
            throw new ConflictException("The new password must be different");
        }
        user.setPasswordHash(passwords.encode(request.newPassword()));
        users.save(user);
    }

    private String token(AppUser user) {
        Instant now = Instant.now();
        JwtClaimsSet.Builder claims = JwtClaimsSet.builder()
                .issuer("eclinician")
                .issuedAt(now)
                .expiresAt(now.plus(ttl))
                .subject(user.getEmail())
                .claim("name", user.getName())
                .claim("role", user.getRole().name());
        if (user.getTenantId() != null) {
            claims.claim("tenant", user.getTenantId());
        }
        // The console's own authority. It travels in the token for the same reason the
        // tenant does: the browser must not be able to award it to itself.
        if (user.isPlatformAdmin()) {
            claims.claim("platform", true);
        }
        // The header has to name HS256 explicitly; the encoder defaults to RS256 and
        // would then find no matching key.
        JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).build();
        return tokens.encode(JwtEncoderParameters.from(header, claims.build())).getTokenValue();
    }
}
