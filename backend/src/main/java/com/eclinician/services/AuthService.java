package com.eclinician.services;

import com.eclinician.domains.dtos.LoginRequest;
import com.eclinician.domains.dtos.LoginResponse;
import com.eclinician.domains.entities.AppUser;
import com.eclinician.repositories.UserRepository;
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

@Service
public class AuthService {

    private final UserRepository users;
    private final PasswordEncoder passwords;
    private final JwtEncoder tokens;
    private final Duration ttl;

    public AuthService(UserRepository users, PasswordEncoder passwords, JwtEncoder tokens,
            @Value("${app.jwt.ttl-minutes:480}") long ttlMinutes) {
        this.users = users;
        this.passwords = passwords;
        this.tokens = tokens;
        this.ttl = Duration.ofMinutes(ttlMinutes);
    }

    public LoginResponse login(LoginRequest request) {
        AppUser user = users.findByEmailIgnoreCase(request.email().trim())
                .filter(AppUser::isActive)
                .filter(found -> passwords.matches(request.password(), found.getPasswordHash()))
                // One message for both a wrong email and a wrong password, so the response
                // cannot be used to discover which accounts exist.
                .orElseThrow(() -> new BadCredentialsException("Invalid email or password"));

        return new LoginResponse(token(user), ttl.toSeconds(), user.getName(), user.getEmail(),
                user.getRole().label(), user.getTenantId(), user.isPlatformAdmin());
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
        // The header has to name HS256 explicitly; the encoder defaults to RS256 and
        // would then find no matching key.
        JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).build();
        return tokens.encode(JwtEncoderParameters.from(header, claims.build())).getTokenValue();
    }
}
