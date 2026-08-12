package com.eclinician.security;

import java.util.List;
import org.springframework.core.MethodParameter;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Hands controllers values off the verified token: the {@code tenant} claim for
 * {@link CurrentTenant}, and the {@code name} claim for {@link CurrentUserName}.
 */
@Component
public class CurrentTenantResolver implements HandlerMethodArgumentResolver, WebMvcConfigurer {

    @Override
    public boolean supportsParameter(MethodParameter parameter) {
        return String.class.equals(parameter.getParameterType())
                && (parameter.hasParameterAnnotation(CurrentTenant.class)
                        || parameter.hasParameterAnnotation(CurrentUserName.class));
    }

    @Override
    public Object resolveArgument(MethodParameter parameter, ModelAndViewContainer mav,
            NativeWebRequest request, WebDataBinderFactory binderFactory) {
        Jwt jwt = token();
        if (parameter.hasParameterAnnotation(CurrentUserName.class)) {
            String name = jwt.getClaimAsString("name");
            return name == null || name.isBlank() ? "Unknown" : name;
        }
        String tenantId = jwt.getClaimAsString("tenant");
        if (tenantId == null || tenantId.isBlank()) {
            // The platform admin belongs to no hospital, so no clinical data is theirs to read.
            throw new AccessDeniedException("This account is not attached to a hospital");
        }
        return tenantId;
    }

    private Jwt token() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof Jwt jwt)) {
            throw new AccessDeniedException("Authentication required");
        }
        return jwt;
    }

    @Override
    public void addArgumentResolvers(List<HandlerMethodArgumentResolver> resolvers) {
        resolvers.add(this);
    }
}
