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
import org.openjudy.common.security.IapHeaders;
import org.openjudy.common.security.IapPrincipal;
import org.openjudy.common.security.IapTokenVerifier;

import java.io.IOException;
import java.security.Principal;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

/**
 * Intercepts incoming requests, validates Google Cloud IAP or Dev headers,
 * and sets up the security context for config-service.
 */
@Provider
@Priority(Priorities.AUTHENTICATION)
@ApplicationScoped
public class IapSecurityFilter implements ContainerRequestFilter {

    private static final Logger LOG = Logger.getLogger(IapSecurityFilter.class);

    @Override
    public void filter(ContainerRequestContext requestContext) throws IOException {
        UriInfo uriInfo = requestContext.getUriInfo();
        String path = uriInfo.getPath();

        // Allow public health checks and OpenAPI / Swagger UI
        if (path.startsWith("/q/") || path.startsWith("q/")) {
            return;
        }

        String jwtAssertion = requestContext.getHeaderString(IapHeaders.X_GOOG_IAP_JWT_ASSERTION);
        String rawEmailHeader = requestContext.getHeaderString(IapHeaders.X_GOOG_AUTHENTICATED_USER_EMAIL);
        String rawIdHeader = requestContext.getHeaderString(IapHeaders.X_GOOG_AUTHENTICATED_USER_ID);
        String devMockHeader = requestContext.getHeaderString(IapHeaders.X_DEV_MOCK_USER);
        String directRoleHeader = requestContext.getHeaderString(IapHeaders.X_OPENJUDY_USER_ROLE);

        if (devMockHeader == null || devMockHeader.isBlank()) {
            devMockHeader = uriInfo.getQueryParameters().getFirst("mockUser");
        }

        String email = "admin@openjudy.org";
        String fullName = "Administrador Geral Open Judy";
        UserRole role = UserRole.ADMIN;
        UUID userId = UUID.fromString("a0000000-0000-0000-0000-000000000004");

        if (devMockHeader != null && !devMockHeader.isBlank()) {
            String mock = devMockHeader.trim().toLowerCase();
            if (mock.contains("camila") || mock.contains("magistrado")) {
                email = "camila.vasconcelos@tjsp.jus.br";
                fullName = "Dra. Camila Vasconcelos de Albuquerque";
                role = UserRole.MAGISTRADO;
                userId = UUID.fromString("a0000000-0000-0000-0000-000000000001");
            } else if (mock.contains("marcos") || mock.contains("assessor")) {
                email = "marcos.assessor@tjsp.jus.br";
                fullName = "Marcos Vinicius de Souza";
                role = UserRole.ASSESSOR;
                userId = UUID.fromString("a0000000-0000-0000-0000-000000000002");
            } else if (mock.contains("lucas") || mock.contains("advogado")) {
                email = "lucas.menezes@advocacia.com.br";
                fullName = "Dr. Lucas Menezes Braga";
                role = UserRole.ADVOGADO;
                userId = UUID.fromString("a0000000-0000-0000-0000-000000000003");
            } else {
                email = mock.contains("@") ? mock : mock + "@openjudy.org";
                fullName = mock;
                role = UserRole.ADMIN;
            }
        } else {
            IapTokenVerifier.ParsedIapIdentity identity = IapTokenVerifier.parseIdentity(jwtAssertion, rawEmailHeader, rawIdHeader);
            if (identity != null && identity.email() != null && !identity.email().isBlank()) {
                email = identity.email();
                fullName = identity.fullName() != null ? identity.fullName() : identity.email();
                if (directRoleHeader != null && !directRoleHeader.isBlank()) {
                    try {
                        role = UserRole.valueOf(directRoleHeader.toUpperCase());
                    } catch (Exception ignored) {}
                }
            }
        }

        final UserRole finalRole = role;
        final List<String> permissions = finalRole.getGrantedPermissions();
        final IapPrincipal principal = new IapPrincipal(
                userId,
                email,
                "iap-sub-" + email,
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
                return "IAP_OIDC";
            }
        });
    }
}
