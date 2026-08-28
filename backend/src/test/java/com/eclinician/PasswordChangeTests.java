package com.eclinician;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.eclinician.domains.dtos.request.LoginRequest;
import com.eclinician.domains.dtos.request.PasswordChangeRequest;
import com.eclinician.domains.enums.UserRole;
import com.eclinician.exceptions.ConflictException;
import com.eclinician.services.AuthService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.transaction.annotation.Transactional;

/** Password self-service: the account owner changes it, and only with the current one. */
@SpringBootTest
@Transactional
class PasswordChangeTests {

    private static final String NEW_PASSWORD = "a-longer-password";

    @Autowired AuthService auth;
    @Autowired TestAccounts accounts;

    @Test
    void theOwnerChangesTheirOwnPasswordAndSignsInWithIt() {
        String email = accounts.create("password-hospital", UserRole.CLINICIAN);

        auth.changePassword(email,
                new PasswordChangeRequest(TestAccounts.PASSWORD, NEW_PASSWORD));

        assertThat(auth.login(new LoginRequest(email, NEW_PASSWORD)).token()).isNotBlank();
        assertThatThrownBy(() -> auth.login(new LoginRequest(email, TestAccounts.PASSWORD)))
                .isInstanceOf(BadCredentialsException.class);
    }

    @Test
    void theCurrentPasswordIsRequired() {
        String email = accounts.create("password-hospital-2", UserRole.RECEPTIONIST);

        assertThatThrownBy(() -> auth.changePassword(email,
                new PasswordChangeRequest("not-the-password", NEW_PASSWORD)))
                .isInstanceOf(BadCredentialsException.class)
                .hasMessageContaining("current password");
    }

    @Test
    void theNewPasswordHasToBeDifferent() {
        String email = accounts.create("password-hospital-3", UserRole.PHARMACIST);

        assertThatThrownBy(() -> auth.changePassword(email,
                new PasswordChangeRequest(TestAccounts.PASSWORD, TestAccounts.PASSWORD)))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("must be different");
    }
}
