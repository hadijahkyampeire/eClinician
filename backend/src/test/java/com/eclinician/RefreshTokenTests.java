package com.eclinician;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.eclinician.domains.dtos.request.LoginRequest;
import com.eclinician.domains.dtos.response.LoginResponse;
import com.eclinician.domains.entities.AppUser;
import com.eclinician.repositories.UserRepository;
import com.eclinician.services.AuthService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

/**
 * What happens when a session runs out. The browser is allowed to buy more time without
 * asking for the password again — and is stopped from doing so once the session is over,
 * the account is closed, or the token has been used by somebody else.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class RefreshTokenTests {

    private static final String TENANT = "refresh-hospital";

    @Autowired MockMvc mvc;
    @Autowired AuthService auth;
    @Autowired UserRepository users;
    @Autowired TestAccounts accounts;

    @Test
    void signingInHandsBackBothTokens() {
        LoginResponse session = signIn(accounts.create(TENANT));

        assertThat(session.token()).isNotEmpty();
        assertThat(session.refreshToken()).isNotEmpty();
        assertThat(session.expiresInSeconds()).isPositive();
    }

    @Test
    void aRefreshTokenBuysAFreshPair() {
        LoginResponse first = signIn(accounts.create(TENANT));

        LoginResponse renewed = auth.refresh(first.refreshToken());

        assertThat(renewed.email()).isEqualTo(first.email());
        assertThat(renewed.role()).isEqualTo(first.role());
        // A renewal that handed back the same refresh token would leave a spent
        // credential in circulation, which is the whole thing rotation prevents.
        assertThat(renewed.refreshToken()).isNotEqualTo(first.refreshToken());
    }

    @Test
    void aSpentRefreshTokenIsRefusedTheSecondTime() {
        LoginResponse session = signIn(accounts.create(TENANT));
        auth.refresh(session.refreshToken());

        assertThatThrownBy(() -> auth.refresh(session.refreshToken()))
                .isInstanceOf(BadCredentialsException.class);
    }

    @Test
    void replayingASpentTokenEndsEverySessionTheAccountHolds() {
        String email = accounts.create(TENANT);
        LoginResponse laptop = signIn(email);
        LoginResponse phone = signIn(email);
        auth.refresh(laptop.refreshToken());

        // The laptop's old token turning up again means a copy is loose. There is no
        // way to tell which browser is honest, so both are sent back to the login page.
        assertThatThrownBy(() -> auth.refresh(laptop.refreshToken()))
                .isInstanceOf(BadCredentialsException.class);
        assertThatThrownBy(() -> auth.refresh(phone.refreshToken()))
                .isInstanceOf(BadCredentialsException.class);
    }

    @Test
    void signingOutStopsTheBrowserRenewingItselfBackIn() {
        LoginResponse session = signIn(accounts.create(TENANT));

        auth.logout(session.refreshToken());

        assertThatThrownBy(() -> auth.refresh(session.refreshToken()))
                .isInstanceOf(BadCredentialsException.class);
    }

    @Test
    void aClosedAccountCannotRenewItsWayPastBeingClosed() {
        String email = accounts.create(TENANT);
        LoginResponse session = signIn(email);

        AppUser user = users.findByEmailIgnoreCase(email).orElseThrow();
        user.setActive(false);
        users.save(user);

        // The account is read again on every renewal rather than trusted from the token,
        // which is what makes deactivating somebody take effect before their token dies.
        assertThatThrownBy(() -> auth.refresh(session.refreshToken()))
                .isInstanceOf(BadCredentialsException.class);
    }

    @Test
    void renewingNeedsNoAccessTokenBecauseTheExpiredOneIsWhyYouAreHere() throws Exception {
        LoginResponse session = signIn(accounts.create(TENANT));

        mvc.perform(post("/api/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"refreshToken\":\"" + session.refreshToken() + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.refreshToken").isNotEmpty());
    }

    @Test
    void aMadeUpRefreshTokenIsRefused() throws Exception {
        mvc.perform(post("/api/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"refreshToken\":\"not-a-token\"}"))
                .andExpect(status().isUnauthorized());
    }

    private LoginResponse signIn(String email) {
        return auth.login(new LoginRequest(email, TestAccounts.PASSWORD));
    }
}
