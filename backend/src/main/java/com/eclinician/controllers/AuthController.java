package com.eclinician.controllers;

import com.eclinician.domains.dtos.LoginRequest;
import com.eclinician.domains.dtos.LoginResponse;
import com.eclinician.domains.dtos.PasswordChangeRequest;
import com.eclinician.services.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PostMapping;
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

    /** Whoever the token says they are, changing their own password and nobody else's. */
    @PostMapping("/password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void changePassword(@AuthenticationPrincipal Jwt caller,
            @Valid @RequestBody PasswordChangeRequest request) {
        authService.changePassword(caller.getSubject(), request);
    }
}
