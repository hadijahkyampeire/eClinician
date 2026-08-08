package com.eclinician.config;

import java.util.Arrays;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/** Allows the configured frontend origins to call the API (Vite dev server locally). */
@Configuration
public class CorsConfig implements WebMvcConfigurer {

    private final String[] allowedOrigins;

    CorsConfig(@Value("${app.cors.allowed-origins:http://localhost:5173}") String configured) {
        this.allowedOrigins = Arrays.stream(configured.split(","))
                .map(String::trim)
                .filter(origin -> !origin.isEmpty())
                .map(CorsConfig::withScheme)
                .toArray(String[]::new);
    }

    /** Render can only hand us a bare hostname, so assume https when no scheme is given. */
    private static String withScheme(String origin) {
        return origin.contains("://") ? origin : "https://" + origin;
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins(allowedOrigins)
                .allowedMethods("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS")
                .allowedHeaders("*");
    }
}
