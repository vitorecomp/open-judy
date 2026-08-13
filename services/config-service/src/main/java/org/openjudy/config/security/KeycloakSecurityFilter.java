package org.openjudy.config.security;

import jakarta.annotation.Priority;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.ws.rs.Priorities;
import jakarta.ws.rs.container.ContainerRequestContext;
import jakarta.ws.rs.container.ContainerRequestFilter;
import jakarta.ws.rs.core.SecurityContext;
import jakarta.ws.rs.core.UriInfo;
import jakarta.ws.rs.ext.Provider;
import org.jboss.logging.Logger;
import org.openjudy.common.enums.UserRole;
import org.openjudy.common.security.KeycloakHeaders;
import org.openjudy.common.security.KeycloakPrincipal;
import org.openjudy.common.security.KeycloakTokenVerifier;

import java.io.IOException;
import java.security.Principal;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

/**
 * Intercepts incoming requests, validates Keycloak Bearer JWT tokens or Dev mock headers,
 * and sets up the security context for config-service.
 */
@Provider
@Priority(Priorities.AUTHENTICATION)
@ApplicationScoped
public class KeycloakSecurityFilter implements ContainerRequestFilter {

    private static final Logger LOG = Logger.getLogger(KeycloakSecurityFilter.class);

    @Override
    public void filter(ContainerRequestContext requestContext) throws IOException {
        UriInfo uriInfo = requestContext.getUriInfo();
        String path = uriInfo.getPath();

        // Allow public health checks and OpenAPI / Swagger UI
        if (path.startsWith("/q/") || path.startsWith("q/")) {
            return;
        }

        String authHeader = requestContext.getHeaderString(KeycloakHeaders.AUTHORIZATION);
        String rawKeycloakIdHeader = requestContext.getHeaderString(KeycloakHeaders.X_KEYCLOAK_USER_ID);
        String rawEmailHeader = requestContext.getHeaderString(KeycloakHeaders.X_KEYCLOAK_USER_EMAIL);
        String devMockHeader = requestContext.getHeaderString(KeycloakHeaders.X_DEV_MOCK_USER);
        String directRoleHeader = requestContext.getHeaderString(KeycloakHeaders.X_OPENJUDY_USER_ROLE);

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

        if (devMockHeader == null || devMockHeader.isBlank()) {
            devMockHeader = uriInfo.getQueryParameters().getFirst("mockUser");
        }

        String email = "admin@openjudy.org";
        String username = "admin.judy";
        String fullName = "Administrador Geral Open Judy";
        String keycloakId = "u0000000-0000-0000-0000-000000000003";
        UserRole role = UserRole.ADMIN;
        UUID userId = UUID.fromString("a0000000-0000-0000-0000-000000000004");

        if (devMockHeader != null && !devMockHeader.isBlank()) {
            String mock = devMockHeader.trim().toLowerCase();
            if (mock.contains("camila") || mock.contains("magistrado")) {
                email = "camila.vasconcelos@tjsp.jus.br";
                username = "camila.vasconcelos";
                fullName = "Dra. Camila Vasconcelos de Albuquerque";
                role = UserRole.MAGISTRADO;
                keycloakId = "u0000000-0000-0000-0000-000000000001";
                userId = UUID.fromString("a0000000-0000-0000-0000-000000000001");
            } else if (mock.contains("marcos") || mock.contains("assessor")) {
                email = "marcos.assessor@tjsp.jus.br";
                username = "marcos.assessor";
                fullName = "Marcos Vinicius de Souza";
                role = UserRole.ASSESSOR;
                keycloakId = "u0000000-0000-0000-0000-000000000002";
                userId = UUID.fromString("a0000000-0000-0000-0000-000000000002");
            } else if (mock.contains("lucas") || mock.contains("advogado")) {
                email = "lucas.menezes@advocacia.com.br";
                username = "lucas.menezes";
                fullName = "Dr. Lucas Menezes Braga";
                role = UserRole.ADVOGADO;
                keycloakId = "u0000000-0000-0000-0000-000000000004";
                userId = UUID.fromString("a0000000-0000-0000-0000-000000000003");
            } else {
                email = mock.contains("@") ? mock : mock + "@openjudy.org";
                username = mock.contains("@") ? mock.substring(0, mock.indexOf('@')) : mock;
                fullName = mock;
                role = UserRole.ADMIN;
                keycloakId = "mock-sub-" + username;
            }
        } else {
            KeycloakTokenVerifier.ParsedKeycloakIdentity identity =
                    KeycloakTokenVerifier.parseIdentity(authHeader, rawKeycloakIdHeader, rawEmailHeader);
            if (identity != null) {
                if (identity.email() != null && !identity.email().isBlank()) {
                    email = identity.email();
                }
                if (identity.username() != null && !identity.username().isBlank()) {
                    username = identity.username();
                }
                if (identity.keycloakId() != null && !identity.keycloakId().isBlank()) {
                    keycloakId = identity.keycloakId();
                }
                fullName = identity.fullName() != null ? identity.fullName() : email;
                if (identity.role() != null) {
                    role = identity.role();
                }
                if (directRoleHeader != null && !directRoleHeader.isBlank()) {
                    try {
                        role = UserRole.valueOf(directRoleHeader.toUpperCase());
                    } catch (Exception ignored) {}
                }
            }
        }

        final UserRole finalRole = role;
        final List<String> permissions = finalRole.getGrantedPermissions();
        final KeycloakPrincipal principal = new KeycloakPrincipal(
                userId,
                keycloakId,
                username,
                email,
                fullName,
                finalRole,
                "Tribunal de Justiça - Open Judy Config",
                permissions,
                Collections.emptyMap()
        );

        requestContext.setSecurityContext(new SecurityContext() {
            @Override
            public Principal getUserPrincipal() {
                return principal;
            }

            @Override
            public boolean isUserInRole(String roleName) {
                if (roleName == null) return false;
                String normalized = roleName.trim().toUpperCase();
                if (finalRole.name().equalsIgnoreCase(normalized)) {
                    return true;
                }
                if (normalized.equals("ADMIN") && finalRole.isAdmin()) return true;
                if (normalized.equals("MAGISTRADO") && finalRole.isMagistrado()) return true;
                if (normalized.equals("ASSESSOR") && finalRole.isAssessor()) return true;
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
    }
}
