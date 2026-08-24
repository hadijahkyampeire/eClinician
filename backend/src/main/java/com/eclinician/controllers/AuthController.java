package com.eclinician.controllers;

import com.eclinician.domains.dtos.LoginRequest;
import com.eclinician.domains.dtos.LoginResponse;
import com.eclinician.domains.dtos.PasswordChangeRequest;
import com.eclinician.domains.dtos.ProfileRequest;
import com.eclinician.domains.dtos.ProfileResponse;
import com.eclinician.domains.dtos.RefreshRequest;
import com.eclinician.services.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    /** The only endpoint that chooses a tenant. Everything after it reads one. */
    @PostMapping("/login")
    public LoginResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }

    /**
     * Trades a refresh token for a fresh pair. Open like login is, because the caller's
     * access token has usually expired by the time they get here — the refresh token is
     * the credential, and {@link AuthService#refresh} is what checks it.
     */
    @PostMapping("/refresh")
    public LoginResponse refresh(@Valid @RequestBody RefreshRequest request) {
        return authService.refresh(request.refreshToken());
    }

    /** Ends the refresh token, so a signed-out browser cannot renew itself back in. */
    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(@Valid @RequestBody RefreshRequest request) {
        authService.logout(request.refreshToken());
    }

    /** Whoever the token says they are, changing their own password and nobody else's. */
    @PostMapping("/password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void changePassword(@AuthenticationPrincipal Jwt caller,
            @Valid @RequestBody PasswordChangeRequest request) {
        authService.changePassword(caller.getSubject(), request);
    }

    @GetMapping("/profile")
    public ProfileResponse profile(@AuthenticationPrincipal Jwt caller) {
        return authService.profile(caller.getSubject());
    }

    @PutMapping("/profile")
    public ProfileResponse updateProfile(@AuthenticationPrincipal Jwt caller,
            @Valid @RequestBody ProfileRequest request) {
        return authService.updateProfile(caller.getSubject(), request);
    }
}
