package com.eclinician.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * The API's own documentation, generated from the controllers rather than written beside
 * them — so it cannot drift from what the code actually serves. Reachable at
 * {@code /swagger-ui.html}, with an Authorize button that takes a token from
 * {@code POST /api/auth/login}, which makes every endpoint callable from the browser.
 */
@Configuration
public class OpenApiConfig {

    @Bean
    OpenAPI eClinicianApi() {
        return new OpenAPI()
                .info(new Info()
                        .title("eClinician API")
                        .version("1.0")
                        .description("""
                                Multi-tenant clinical management. Every endpoint except
                                /api/health and /api/auth/login needs a bearer token, and the
                                tenant is read from that token rather than from the request —
                                so there is nothing here for a caller to edit.

                                To try one: POST /api/auth/login with a demo account, copy the
                                token from the response, press Authorize above, paste it, and
                                call anything the role is allowed to reach. A role it is not
                                allowed to reach answers 403.
                                """))
                .addSecurityItem(new SecurityRequirement().addList("bearer-jwt"))
                .components(new Components().addSecuritySchemes("bearer-jwt",
                        new SecurityScheme()
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")
                                .description("The token from POST /api/auth/login")));
    }
}
