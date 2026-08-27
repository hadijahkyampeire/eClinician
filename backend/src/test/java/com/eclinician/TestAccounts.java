package com.eclinician;

import com.eclinician.domains.dtos.request.LoginRequest;
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
        return bearerFor(tenantId, UserRole.CLINICIAN);
    }

    String bearerFor(String tenantId, UserRole role) {
        return "Bearer " + auth.login(new LoginRequest(create(tenantId, role), PASSWORD)).token();
    }

    String create(String tenantId) {
        return create(tenantId, UserRole.CLINICIAN);
    }

    /** The account's name is derived from its role, so audit fields are readable in assertions. */
    String create(String tenantId, UserRole role) {
        String email = role.name().toLowerCase() + "." + tenantId + "@example.com";
        if (users.existsByEmailIgnoreCase(email)) return email;
        AppUser user = new AppUser();
        user.setName(nameFor(role));
        user.setEmail(email);
        user.setPasswordHash(passwords.encode(PASSWORD));
        user.setRole(role);
        user.setTenantId(tenantId);
        users.save(user);
        return email;
    }

    static String nameFor(UserRole role) {
        return "Test " + role.label();
    }
}
