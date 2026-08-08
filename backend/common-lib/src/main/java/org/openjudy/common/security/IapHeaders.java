package org.openjudy.common.security;

/**
 * Standard HTTP Header constants for Google Cloud IAP and Open Judy internal propagation.
 */
public final class IapHeaders {

    private IapHeaders() {
        // Prevent instantiation
    }

    /**
     * The cryptographically signed JWT assertion header provided by Google Cloud IAP.
     */
    public static final String X_GOOG_IAP_JWT_ASSERTION = "X-Goog-IAP-JWT-Assertion";

    /**
     * The authenticated user's email header provided by Google Cloud IAP (e.g. accounts.google.com:user@domain.com).
     */
    public static final String X_GOOG_AUTHENTICATED_USER_EMAIL = "X-Goog-Authenticated-User-Email";

    /**
     * The unique stable user ID header provided by Google Cloud IAP (e.g. accounts.google.com:1123456789...).
     */
    public static final String X_GOOG_AUTHENTICATED_USER_ID = "X-Goog-Authenticated-User-Id";

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
     * Header used in local development / dev mode to simulate specific user identities without IAP.
     */
    public static final String X_DEV_MOCK_USER = "X-Dev-Mock-User";
}
