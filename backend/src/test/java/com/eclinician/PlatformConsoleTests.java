package com.eclinician;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.eclinician.domains.dtos.LoginRequest;
import com.eclinician.domains.dtos.TenantRequest;
import com.eclinician.domains.dtos.TenantResponse;
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
                List.of(ClinicModule.PATIENTS, ClinicModule.APPOINTMENTS, ClinicModule.PHARMACY)));
        String email = accounts.create("clinic-two", UserRole.RECEPTIONIST);

        assertThat(auth.login(new LoginRequest(email, TestAccounts.PASSWORD)).tenant())
                .satisfies(tenant -> {
                    assertThat(tenant.name()).isEqualTo("Clinic Two");
                    assertThat(tenant.primaryColor()).isEqualTo("#123456");
                    assertThat(tenant.enabledModules())
                            .containsExactly("patients", "appointments", "records", "pharmacy")
                            .doesNotContain("laboratory");
                });
    }

    /** Reception and the consulting room are not a subscription: nobody can sell a
     *  hospital a system that cannot register a patient or record a consultation. */
    @Test
    void theCoreModulesArriveEvenWhenNobodyAsksForThem() {
        assertThat(tenants.create(new TenantRequest("clinic-six", "Clinic Six", "#123456",
                List.of(ClinicModule.LABORATORY))).enabledModules())
                .containsExactly("patients", "appointments", "records", "laboratory");

        assertThat(tenants.update("clinic-six", new TenantRequest("clinic-six", "Clinic Six",
                "#123456", List.of())).enabledModules())
                .containsExactly("patients", "appointments", "records");
    }

    /** A hospital nobody can sign in to is not onboarded, so the console creates its first
     *  administrator in the same step. */
    @Test
    void onboardingCreatesTheHospitalsFirstAdministrator() {
        tenants.create(new TenantRequest("clinic-five", "Clinic Five", "#123456",
                List.of(ClinicModule.PATIENTS), "Ada Nakato", "ada@clinicfive.test", "a-long-password"));

        assertThat(auth.login(new LoginRequest("ada@clinicfive.test", "a-long-password")))
                .satisfies(session -> {
                    assertThat(session.role()).isEqualTo("Administrator");
                    assertThat(session.tenantId()).isEqualTo("clinic-five");
                    assertThat(session.platformAdmin()).isFalse();
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

    /**
     * The address is recorded at onboarding, and the console's three filters read it back
     * out of the database rather than the browser. Country is matched exactly, subdivision
     * case-insensitively, and the search covers the slug as well as the name.
     */
    @Test
    void hospitalsAreFoundByNameCountryAndSubdivision() {
        tenants.create(kampala("mulago-hospital", "Mulago Hospital"));
        tenants.create(kampala("nsambya-clinic", "Nsambya Clinic"));
        tenants.create(new TenantRequest("lagos-general", "Lagos General", "#123456",
                List.of(ClinicModule.PATIENTS), "1 Marina Road", "Lagos", "Lagos", "101001",
                "ng", "+2348000000000", "front@lagosgeneral.test", "Africa/Lagos",
                null, null, null));

        assertThat(names(tenants.list("mulago", null, null))).containsExactly("Mulago Hospital");
        // The slug is what every other table carries, so it is searchable too.
        assertThat(names(tenants.list("nsambya-clinic", null, null)))
                .containsExactly("Nsambya Clinic");
        assertThat(names(tenants.list(null, "NG", null))).containsExactly("Lagos General");
        // Case-insensitive, and it finds the seeded clinic in Kampala alongside these two.
        assertThat(names(tenants.list(null, null, "kampala")))
                .contains("Mulago Hospital", "Nsambya Clinic")
                .doesNotContain("Lagos General");
        // Filters narrow together: Mulago is in UG/Kampala but does not match the search,
        // and Lagos General matches neither the country nor the subdivision.
        assertThat(names(tenants.list("nsambya", "UG", "Kampala")))
                .containsExactly("Nsambya Clinic");
        // A blank filter is the same as no filter at all.
        assertThat(names(tenants.list("   ", null, null))).contains("Mulago Hospital");
    }

    /** A filter may only offer values a hospital actually has, or it selects nothing. */
    @Test
    void theFilterOptionsOnlyOfferPlacesAHospitalIsIn() {
        tenants.create(kampala("gulu-clinic", "Gulu Clinic"));

        assertThat(tenants.filterOptions(null).countries()).contains("UG").doesNotContain("NG");
        assertThat(tenants.filterOptions("UG").subdivisions()).contains("Kampala");
        // Subdivisions follow the country already chosen, so the two cannot contradict.
        assertThat(tenants.filterOptions("NG").subdivisions()).doesNotContain("Kampala");
    }

    /** The country is stored upper case, so the filter is a plain equality match. */
    @Test
    void theCountryIsNormalisedOnTheWayIn() {
        assertThat(tenants.create(kampala("jinja-clinic", "Jinja Clinic")).country())
                .isEqualTo("UG");
    }

    /**
     * The clinic's clock is what its rota hours mean, so a typo in it would quietly move
     * every shift. Better to refuse the onboarding than to accept a zone and ignore it.
     */
    @Test
    void aHospitalCarriesItsOwnTimeZoneAndAnUnknownOneIsRefused() {
        assertThat(tenants.create(kampala("kla-clinic", "Kampala Clinic")).timeZone())
                .isEqualTo("Africa/Kampala");

        assertThatThrownBy(() -> tenants.create(new TenantRequest(
                "nowhere-clinic", "Nowhere", "#123456", List.of(ClinicModule.PATIENTS),
                null, null, null, null, null, null, null, "Mars/Olympus_Mons",
                null, null, null)))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("Unknown time zone");
    }

    /** Left blank, a hospital keeps the zone it already had. */
    @Test
    void aBlankTimeZoneLeavesItAlone() {
        tenants.create(kampala("keep-zone-clinic", "Keep Zone"));

        assertThat(tenants.update("keep-zone-clinic", new TenantRequest(
                "keep-zone-clinic", "Renamed", "#123456", List.of(ClinicModule.PATIENTS)))
                .timeZone()).isEqualTo("Africa/Kampala");
    }

    private static TenantRequest kampala(String id, String name) {
        return new TenantRequest(id, name, "#0f766e", List.of(ClinicModule.PATIENTS),
                "Plot 1, Some Road", "Kampala", "Kampala", "P.O. Box 1", "ug",
                "+256700000001", null, "Africa/Kampala", null, null, null);
    }

    private static List<String> names(List<TenantResponse> hospitals) {
        return hospitals.stream().map(TenantResponse::name).toList();
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
