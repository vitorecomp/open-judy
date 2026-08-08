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
import org.openjudy.common.security.IapHeaders;
import org.openjudy.common.security.IapPrincipal;
import org.openjudy.common.security.IapTokenVerifier;
import org.openjudy.users.service.UserService;

import java.io.IOException;
import java.security.Principal;
import java.util.Collections;
import java.util.List;

/**
 * Quarkus ContainerRequestFilter that intercepts incoming HTTP requests from Google Cloud IAP
 * or development mock headers, verifies credentials, JIT-provisions the user if needed,
 * and sets up the security context with ADMIN, MAGISTRADO, or ASSESSOR roles.
 */
@Provider
@Priority(Priorities.AUTHENTICATION)
@ApplicationScoped
public class IapSecurityFilter implements ContainerRequestFilter {

    private static final Logger LOG = Logger.getLogger(IapSecurityFilter.class);

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

        String jwtAssertion = requestContext.getHeaderString(IapHeaders.X_GOOG_IAP_JWT_ASSERTION);
        String rawEmailHeader = requestContext.getHeaderString(IapHeaders.X_GOOG_AUTHENTICATED_USER_EMAIL);
        String rawIdHeader = requestContext.getHeaderString(IapHeaders.X_GOOG_AUTHENTICATED_USER_ID);
        String devMockHeader = requestContext.getHeaderString(IapHeaders.X_DEV_MOCK_USER);

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
                resolvedUser = userService.resolveUserFromIap(
                        mockKey.contains("@") ? mockKey : mockKey + "@openjudy.org",
                        null,
                        "dev-mock-sub-" + mockKey
                );
            }
        }

        // 2. Parse from IAP headers / signed JWT
        if (resolvedUser == null) {
            IapTokenVerifier.ParsedIapIdentity identity = IapTokenVerifier.parseIdentity(
                    jwtAssertion,
                    rawEmailHeader,
                    rawIdHeader
            );

            if (identity != null && identity.email() != null && !identity.email().isBlank()) {
                resolvedUser = userService.resolveUserFromIap(
                        identity.email(),
                        identity.fullName(),
                        identity.subjectId()
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

            final IapPrincipal principal = new IapPrincipal(
                    user.id(),
                    user.email(),
                    user.keycloakId(),
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
                    return "IAP_OIDC";
                }
            });

            // Propagate internal identity headers for downstream services
            requestContext.getHeaders().putSingle(IapHeaders.X_OPENJUDY_USER_ID, user.id().toString());
            requestContext.getHeaders().putSingle(IapHeaders.X_OPENJUDY_USER_ROLE, role.name());
            requestContext.getHeaders().putSingle(IapHeaders.X_OPENJUDY_USER_EMAIL, user.email());
        }
    }
}
