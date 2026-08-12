package com.eclinician;

import com.eclinician.domains.dtos.LoginRequest;
import com.eclinician.domains.entities.AppUser;
import com.eclinician.domains.enums.UserRole;
import com.eclinician.repositories.UserRepository;
import com.eclinician.services.AuthService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/** Creates a staff account for a tenant and logs it in, the way a browser would. */
@Component
public class TestAccounts {

    static final String PASSWORD = "test-password";

    private final UserRepository users;
    private final PasswordEncoder passwords;
    private final AuthService auth;

    TestAccounts(UserRepository users, PasswordEncoder passwords, AuthService auth) {
        this.users = users;
        this.passwords = passwords;
        this.auth = auth;
    }

    /** @return an Authorization header value for a clinician of this tenant. */
    String bearerFor(String tenantId) {
        return "Bearer " + auth.login(new LoginRequest(create(tenantId), PASSWORD)).token();
    }

    String create(String tenantId) {
        String email = "staff." + tenantId + "@example.com";
        if (users.existsByEmailIgnoreCase(email)) return email;
        AppUser user = new AppUser();
        user.setName("Test Staff");
        user.setEmail(email);
        user.setPasswordHash(passwords.encode(PASSWORD));
        user.setRole(UserRole.CLINICIAN);
        user.setTenantId(tenantId);
        users.save(user);
        return email;
    }
}
