package com.eclinician.services;

import com.eclinician.domains.entities.RefreshToken;
import com.eclinician.repositories.RefreshTokenRepository;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.stereotype.Service;

/**
 * Issues, spends and tears up refresh tokens.
 *
 * <p>A token is spent the first time it is exchanged: every refresh hands back a new one
 * and revokes the old. That rotation is what makes a stolen token detectable — the thief
 * and the owner cannot both use the same one, and whoever comes second is refused.
 *
 * <p>Nothing here is {@code @Transactional} on purpose. Each repository call commits on
 * its own, so the revocations below survive the exception thrown right after them.
 */
@Service
public class RefreshTokenService {

    private static final SecureRandom RANDOM = new SecureRandom();

    private final RefreshTokenRepository tokens;
    private final Duration ttl;

    public RefreshTokenService(RefreshTokenRepository tokens,
            @Value("${app.jwt.refresh-ttl-days:7}") long ttlDays) {
        this.tokens = tokens;
        this.ttl = Duration.ofDays(ttlDays);
    }

    /** Hands back the raw token. This is the only time it exists outside the browser. */
    public String issue(String email) {
        byte[] material = new byte[32];
        RANDOM.nextBytes(material);
        String raw = Base64.getUrlEncoder().withoutPadding().encodeToString(material);

        Instant now = Instant.now();
        RefreshToken token = new RefreshToken();
        token.setTokenHash(hash(raw));
        token.setUserEmail(email);
        token.setIssuedAt(now);
        token.setExpiresAt(now.plus(ttl));
        tokens.save(token);
        return raw;
    }

    /** Spends a token and reports whose it was. The caller issues the replacement. */
    public String exchange(String raw) {
        RefreshToken found = tokens.findByTokenHash(hash(raw)).orElseThrow(this::ended);
        if (found.getRevokedAt() != null) {
            // A spent token presented a second time means a copy is loose. There is no
            // way to tell the thief from the owner, so every session this account holds
            // is ended and both are sent back to the login page.
            revokeAllFor(found.getUserEmail());
            throw ended();
        }
        if (!found.isUsable(Instant.now())) throw ended();

        found.setRevokedAt(Instant.now());
        tokens.save(found);
        return found.getUserEmail();
    }

    /** Signing out. Unknown or already-spent tokens are ignored: the goal is reached. */
    public void revoke(String raw) {
        tokens.findByTokenHash(hash(raw))
                .filter(token -> token.getRevokedAt() == null)
                .ifPresent(token -> {
                    token.setRevokedAt(Instant.now());
                    tokens.save(token);
                });
    }

    public void revokeAllFor(String email) {
        Instant now = Instant.now();
        List<RefreshToken> live = tokens.findByUserEmailIgnoreCaseAndRevokedAtIsNull(email);
        live.forEach(token -> token.setRevokedAt(now));
        tokens.saveAll(live);
    }

    /** One message for every failure, so a probe learns nothing from which one it hit. */
    private BadCredentialsException ended() {
        return new BadCredentialsException("Your session has ended. Please sign in again.");
    }

    private static String hash(String raw) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(raw.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException impossible) {
            throw new IllegalStateException("SHA-256 is required of every JVM", impossible);
        }
    }
}
