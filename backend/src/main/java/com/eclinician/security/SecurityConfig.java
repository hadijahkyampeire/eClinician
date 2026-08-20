package com.eclinician.security;

import com.nimbusds.jose.jwk.source.ImmutableSecret;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.security.web.SecurityFilterChain;

/**
 * Stateless JWT security. Only health and login are open; everything else needs a
 * token this service signed, and the tenant is read from that token rather than a
 * header the caller controls.
 *
 * <p>{@code @EnableMethodSecurity} switches on the {@code @PreAuthorize} rules the
 * controllers carry, so a role is enforced on the server and not merely hidden in the UI.
 */
@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    private static final Logger log = LoggerFactory.getLogger(SecurityConfig.class);

    private final SecretKey key;

    SecurityConfig(@Value("${app.jwt.secret:}") String secret) {
        this.key = new SecretKeySpec(
                keyMaterial(secret).getBytes(StandardCharsets.UTF_8), "HmacSHA256");
    }

    /**
     * No signing key is committed to the repository. In a deployment {@code JWT_SECRET}
     * supplies one; with nothing set, a random key is generated for this process alone,
     * so a developer can run the app without a secret and no default key ever ships in
     * the source. Tokens then stop working when the app restarts, which is the intended
     * reminder that the key is missing.
     */
    private static String keyMaterial(String secret) {
        if (secret != null && secret.length() >= 32) return secret;
        if (secret != null && !secret.isBlank()) {
            throw new IllegalStateException("JWT_SECRET must be at least 32 characters");
        }
        byte[] random = new byte[32];
        new SecureRandom().nextBytes(random);
        log.warn("No JWT_SECRET set — generated a random signing key for this process. "
                + "Sign-ins will not survive a restart.");
        return Base64.getUrlEncoder().withoutPadding().encodeToString(random);
    }

    @Bean
    SecurityFilterChain apiSecurity(HttpSecurity http) throws Exception {
        return http
                .csrf(csrf -> csrf.disable())
                .cors(Customizer.withDefaults())
                .sessionManagement(session ->
                        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(requests -> requests
                        .requestMatchers("/api/health", "/api/auth/login").permitAll()
                        .anyRequest().authenticated())
                .oauth2ResourceServer(server -> server.jwt(jwt -> jwt
                        .jwtAuthenticationConverter(roleConverter())))
                .build();
    }

    /**
     * Turns the token's {@code role} claim into a Spring Security authority, so
     * {@code hasAnyRole('PHARMACIST')} works against a claim the caller cannot forge.
     */
    private JwtAuthenticationConverter roleConverter() {
        JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
        converter.setJwtGrantedAuthoritiesConverter(jwt -> {
            List<GrantedAuthority> authorities = new ArrayList<>();
            String role = jwt.getClaimAsString("role");
            if (role != null) authorities.add(new SimpleGrantedAuthority("ROLE_" + role));
            if (Boolean.TRUE.equals(jwt.getClaim("platform"))) {
                authorities.add(new SimpleGrantedAuthority("ROLE_PLATFORM_ADMIN"));
            }
            return authorities;
        });
        return converter;
    }

    @Bean
    JwtEncoder jwtEncoder() {
        return new NimbusJwtEncoder(new ImmutableSecret<>(key));
    }

    @Bean
    JwtDecoder jwtDecoder() {
        return NimbusJwtDecoder.withSecretKey(key).macAlgorithm(MacAlgorithm.HS256).build();
    }

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
