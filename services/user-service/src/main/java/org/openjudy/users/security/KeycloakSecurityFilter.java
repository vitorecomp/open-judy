package org.openjudy.users.security;

import jakarta.annotation.Priority;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.Priorities;
import jakarta.ws.rs.container.ContainerRequestContext;
import jakarta.ws.rs.container.ContainerRequestFilter;
import jakarta.ws.rs.core.SecurityContext;
import jakarta.ws.rs.core.UriInfo;
import jakarta.ws.rs.ext.Provider;
import org.jboss.logging.Logger;
import org.openjudy.common.dto.UserDTO;
import org.openjudy.common.enums.UserRole;
import org.openjudy.common.security.KeycloakHeaders;
import org.openjudy.common.security.KeycloakPrincipal;
import org.openjudy.common.security.KeycloakTokenVerifier;
import org.openjudy.users.service.UserService;

import java.io.IOException;
import java.security.Principal;
import java.util.Collections;
import java.util.List;

/**
 * Quarkus ContainerRequestFilter that intercepts incoming HTTP requests,
 * authenticates via Keycloak OpenID Connect (OIDC) Bearer tokens or dev mock headers,
 * syncs/JIT-provisions user identities, and sets up the security context with
 * ADMIN, MAGISTRADO, ASSESSOR, or ADVOGADO roles.
 */
@Provider
@Priority(Priorities.AUTHENTICATION)
@ApplicationScoped
public class KeycloakSecurityFilter implements ContainerRequestFilter {

    private static final Logger LOG = Logger.getLogger(KeycloakSecurityFilter.class);

    @Inject
    UserService userService;

    @Override
    public void filter(ContainerRequestContext requestContext) throws IOException {
        UriInfo uriInfo = requestContext.getUriInfo();
        String path = uriInfo.getPath();

        // Allow public health checks and Swagger UI
        if (path.startsWith("/q/") || path.startsWith("q/")) {
            return;
        }

        String authHeader = requestContext.getHeaderString(KeycloakHeaders.AUTHORIZATION);
        String rawKeycloakIdHeader = requestContext.getHeaderString(KeycloakHeaders.X_KEYCLOAK_USER_ID);
        String rawEmailHeader = requestContext.getHeaderString(KeycloakHeaders.X_KEYCLOAK_USER_EMAIL);
        String devMockHeader = requestContext.getHeaderString(KeycloakHeaders.X_DEV_MOCK_USER);

        // Check legacy headers if present
        if (rawEmailHeader == null || rawEmailHeader.isBlank()) {
            rawEmailHeader = requestContext.getHeaderString(KeycloakHeaders.X_GOOG_AUTHENTICATED_USER_EMAIL);
        }
        if (rawKeycloakIdHeader == null || rawKeycloakIdHeader.isBlank()) {
            rawKeycloakIdHeader = requestContext.getHeaderString(KeycloakHeaders.X_GOOG_AUTHENTICATED_USER_ID);
        }
        if (authHeader == null || authHeader.isBlank()) {
            String legacyJwt = requestContext.getHeaderString(KeycloakHeaders.X_GOOG_IAP_JWT_ASSERTION);
            if (legacyJwt != null && !legacyJwt.isBlank()) {
                authHeader = "Bearer " + legacyJwt;
            }
        }

        // Check query param fallback for dev testing: ?mockUser=camila.vasconcelos / marcos.assessor / admin.judy
        if (devMockHeader == null || devMockHeader.isBlank()) {
            devMockHeader = uriInfo.getQueryParameters().getFirst("mockUser");
        }

        UserDTO resolvedUser = null;

        // 1. Check if dev mock user is explicitly provided (Dev/Testing Mode)
        if (devMockHeader != null && !devMockHeader.isBlank()) {
            String mockKey = devMockHeader.trim().toLowerCase();
            resolvedUser = userService.findUserByUsernameOrEmail(mockKey);
            if (resolvedUser == null) {
                // If not found in database, provision mock profile
                resolvedUser = userService.resolveUserFromKeycloak(
                        "mock-sub-" + mockKey,
                        mockKey.contains("@") ? mockKey.substring(0, mockKey.indexOf('@')) : mockKey,
                        mockKey.contains("@") ? mockKey : mockKey + "@openjudy.org",
                        null,
                        null,
                        "3ª Vara Cível Central da Comarca de São Paulo/SP",
                        null
                );
            }
        }

        // 2. Parse from Keycloak Bearer Token / OIDC JWT or headers
        if (resolvedUser == null) {
            KeycloakTokenVerifier.ParsedKeycloakIdentity identity = KeycloakTokenVerifier.parseIdentity(
                    authHeader,
                    rawKeycloakIdHeader,
                    rawEmailHeader
            );

            if (identity != null) {
                resolvedUser = userService.resolveUserFromKeycloak(
                        identity.keycloakId(),
                        identity.username(),
                        identity.email(),
                        identity.fullName(),
                        identity.role(),
                        identity.courtJurisdiction(),
                        identity.documentNumber()
                );
            }
        }

        // 3. Fallback to default user in development if no headers provided
        if (resolvedUser == null) {
            resolvedUser = userService.findUserByUsernameOrEmail("camila.vasconcelos");
        }

        if (resolvedUser != null) {
            final UserDTO user = resolvedUser;
            final UserRole role = user.role() != null ? user.role() : UserRole.ASSESSOR;
            final List<String> permissions = role.getGrantedPermissions();

            final KeycloakPrincipal principal = new KeycloakPrincipal(
                    user.id(),
                    user.keycloakId() != null ? user.keycloakId() : "keycloak-sub-" + user.username(),
                    user.username(),
                    user.email(),
                    user.fullName(),
                    role,
                    user.courtJurisdiction(),
                    permissions,
                    Collections.emptyMap()
            );

            // Establish Quarkus SecurityContext
            requestContext.setSecurityContext(new SecurityContext() {
                @Override
                public Principal getUserPrincipal() {
                    return principal;
                }

                @Override
                public boolean isUserInRole(String roleName) {
                    if (roleName == null) return false;
                    String normalized = roleName.trim().toUpperCase();

                    if (role.name().equalsIgnoreCase(normalized)) {
                        return true;
                    }
                    if (normalized.equals("ADMIN") && role.isAdmin()) return true;
                    if (normalized.equals("MAGISTRADO") && role.isMagistrado()) return true;
                    if (normalized.equals("ASSESSOR") && role.isAssessor()) return true;

                    // Support checking granular permissions as roles (e.g. "atas:sign")
                    return permissions.contains(roleName.toLowerCase());
                }

                @Override
                public boolean isSecure() {
                    return uriInfo.getRequestUri().getScheme().equalsIgnoreCase("https");
                }

                @Override
                public String getAuthenticationScheme() {
                    return "KEYCLOAK_OIDC";
                }
            });

            // Propagate internal identity headers for downstream services
            requestContext.getHeaders().putSingle(KeycloakHeaders.X_OPENJUDY_USER_ID, user.id().toString());
            requestContext.getHeaders().putSingle(KeycloakHeaders.X_OPENJUDY_USER_ROLE, role.name());
            requestContext.getHeaders().putSingle(KeycloakHeaders.X_OPENJUDY_USER_EMAIL, user.email());
        }
    }
}
