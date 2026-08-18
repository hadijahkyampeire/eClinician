package com.eclinician;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.eclinician.domains.dtos.LoginRequest;
import com.eclinician.domains.dtos.TenantRequest;
import com.eclinician.domains.entities.AppUser;
import com.eclinician.domains.enums.ClinicModule;
import com.eclinician.domains.enums.UserRole;
import com.eclinician.repositories.UserRepository;
import com.eclinician.services.AuthService;
import com.eclinician.services.TenantService;
import com.eclinician.web.ConflictException;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

/** The platform console: who may reach it, and what onboarding a hospital changes. */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class PlatformConsoleTests {

    @Autowired MockMvc mvc;
    @Autowired TenantService tenants;
    @Autowired AuthService auth;
    @Autowired UserRepository users;
    @Autowired PasswordEncoder passwords;
    @Autowired TestAccounts accounts;

    @Test
    void onlyThePlatformAdministratorReachesTheConsole() throws Exception {
        mvc.perform(get("/api/platform/hospitals")
                        .header(HttpHeaders.AUTHORIZATION,
                                accounts.bearerFor("console-hospital", UserRole.ADMINISTRATOR)))
                .andExpect(status().isForbidden());

        mvc.perform(get("/api/platform/hospitals")
                        .header(HttpHeaders.AUTHORIZATION, platformBearer()))
                .andExpect(status().isOk());
    }

    @Test
    void thePlatformAdministratorCannotReachClinicalData() throws Exception {
        // No tenant claim, so there is nothing for the tenant resolver to hand a controller.
        mvc.perform(get("/api/patients").header(HttpHeaders.AUTHORIZATION, platformBearer()))
                .andExpect(status().isForbidden());
    }

    @Test
    void onboardingAHospitalDecidesWhatItsStaffSee() {
        tenants.create(new TenantRequest("clinic-two", "Clinic Two", "#123456",
                List.of(ClinicModule.PATIENTS, ClinicModule.APPOINTMENTS)));
        String email = accounts.create("clinic-two", UserRole.RECEPTIONIST);

        assertThat(auth.login(new LoginRequest(email, TestAccounts.PASSWORD)).tenant())
                .satisfies(tenant -> {
                    assertThat(tenant.name()).isEqualTo("Clinic Two");
                    assertThat(tenant.primaryColor()).isEqualTo("#123456");
                    assertThat(tenant.enabledModules())
                            .containsExactly("patients", "appointments");
                });
    }

    @Test
    void anIdentifierCannotBeUsedTwice() {
        tenants.create(new TenantRequest("clinic-three", "Clinic Three", "#123456",
                List.of(ClinicModule.PATIENTS)));

        assertThatThrownBy(() -> tenants.create(new TenantRequest("clinic-three", "Impostor",
                "#654321", List.of(ClinicModule.PATIENTS))))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("already exists");
    }

    @Test
    void suspendingAHospitalStopsItsStaffSigningIn() {
        tenants.create(new TenantRequest("clinic-four", "Clinic Four", "#123456",
                List.of(ClinicModule.PATIENTS)));
        String email = accounts.create("clinic-four", UserRole.CLINICIAN);
        assertThat(auth.login(new LoginRequest(email, TestAccounts.PASSWORD)).token()).isNotBlank();

        tenants.setActive("clinic-four", false);

        assertThatThrownBy(() -> auth.login(new LoginRequest(email, TestAccounts.PASSWORD)))
                .isInstanceOf(BadCredentialsException.class)
                .hasMessageContaining("suspended");
    }

    /** The seeded platform administrator has no tenant, so it is built here directly. */
    private String platformBearer() {
        String email = "platform.test@example.com";
        if (!users.existsByEmailIgnoreCase(email)) {
            AppUser user = new AppUser();
            user.setName("Platform Admin");
            user.setEmail(email);
            user.setPasswordHash(passwords.encode(TestAccounts.PASSWORD));
            user.setRole(UserRole.ADMINISTRATOR);
            user.setPlatformAdmin(true);
            users.save(user);
        }
        return "Bearer " + auth.login(new LoginRequest(email, TestAccounts.PASSWORD)).token();
    }
}
