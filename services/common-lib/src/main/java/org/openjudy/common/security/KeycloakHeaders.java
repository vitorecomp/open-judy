package org.openjudy.common.security;

/**
 * Standard HTTP Header constants for Keycloak IAM / OIDC and Open Judy identity propagation.
 */
public final class KeycloakHeaders {

    private KeycloakHeaders() {
        // Prevent instantiation
    }

    /**
     * Standard HTTP Authorization header containing Bearer JWT token from Keycloak.
     */
    public static final String AUTHORIZATION = "Authorization";

    /**
     * Standard Bearer prefix for JWT tokens.
     */
    public static final String BEARER_PREFIX = "Bearer ";

    /**
     * Keycloak Subject ID (sub / UUID) header.
     */
    public static final String X_KEYCLOAK_USER_ID = "X-Keycloak-User-Id";

    /**
     * Keycloak Authenticated User Email header.
     */
    public static final String X_KEYCLOAK_USER_EMAIL = "X-Keycloak-User-Email";

    /**
     * Keycloak Authenticated User Full Name header.
     */
    public static final String X_KEYCLOAK_USER_NAME = "X-Keycloak-User-Name";

    /**
     * Keycloak User Preferred Username header.
     */
    public static final String X_KEYCLOAK_USERNAME = "X-Keycloak-Username";

    /**
     * Keycloak Realm / Client Roles header (comma separated).
     */
    public static final String X_KEYCLOAK_ROLES = "X-Keycloak-Roles";

    /**
     * Internal Open Judy user ID propagated between backend services.
     */
    public static final String X_OPENJUDY_USER_ID = "X-OpenJudy-User-Id";

    /**
     * Internal Open Judy user role (ADMIN, MAGISTRADO, ASSESSOR) propagated between backend services.
     */
    public static final String X_OPENJUDY_USER_ROLE = "X-OpenJudy-User-Role";

    /**
     * Internal Open Judy user email propagated between backend services.
     */
    public static final String X_OPENJUDY_USER_EMAIL = "X-OpenJudy-User-Email";

    /**
     * Header used in local development / dev mode to simulate specific user identities without Keycloak.
     */
    public static final String X_DEV_MOCK_USER = "X-Dev-Mock-User";

    /**
     * Legacy header compatibility.
     */
    public static final String X_GOOG_IAP_JWT_ASSERTION = "X-Goog-IAP-JWT-Assertion";
    public static final String X_GOOG_AUTHENTICATED_USER_EMAIL = "X-Goog-Authenticated-User-Email";
    public static final String X_GOOG_AUTHENTICATED_USER_ID = "X-Goog-Authenticated-User-Id";
}
