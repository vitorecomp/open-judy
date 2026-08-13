package org.openjudy.common.security;

/**
 * Standard HTTP Header constants for Open Judy authentication.
 * @deprecated Use {@link KeycloakHeaders} instead.
 */
@Deprecated
public final class IapHeaders {

    private IapHeaders() {
        // Prevent instantiation
    }

    public static final String AUTHORIZATION = KeycloakHeaders.AUTHORIZATION;
    public static final String BEARER_PREFIX = KeycloakHeaders.BEARER_PREFIX;
    public static final String X_KEYCLOAK_USER_ID = KeycloakHeaders.X_KEYCLOAK_USER_ID;
    public static final String X_KEYCLOAK_USER_EMAIL = KeycloakHeaders.X_KEYCLOAK_USER_EMAIL;
    public static final String X_OPENJUDY_USER_ID = KeycloakHeaders.X_OPENJUDY_USER_ID;
    public static final String X_OPENJUDY_USER_ROLE = KeycloakHeaders.X_OPENJUDY_USER_ROLE;
    public static final String X_OPENJUDY_USER_EMAIL = KeycloakHeaders.X_OPENJUDY_USER_EMAIL;
    public static final String X_DEV_MOCK_USER = KeycloakHeaders.X_DEV_MOCK_USER;

    public static final String X_GOOG_IAP_JWT_ASSERTION = KeycloakHeaders.X_GOOG_IAP_JWT_ASSERTION;
    public static final String X_GOOG_AUTHENTICATED_USER_EMAIL = KeycloakHeaders.X_GOOG_AUTHENTICATED_USER_EMAIL;
    public static final String X_GOOG_AUTHENTICATED_USER_ID = KeycloakHeaders.X_GOOG_AUTHENTICATED_USER_ID;
}
