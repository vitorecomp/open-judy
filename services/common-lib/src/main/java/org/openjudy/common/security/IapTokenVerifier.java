package org.openjudy.common.security;

import java.util.Collections;
import java.util.Map;

/**
 * Utility for parsing tokens and headers.
 * @deprecated Use {@link KeycloakTokenVerifier} instead.
 */
@Deprecated
public class IapTokenVerifier {

    public record ParsedIapIdentity(
            String email,
            String subjectId,
            String fullName,
            String hostedDomain,
            Map<String, Object> claims,
            boolean isJwtVerified
    ) {}

    public static ParsedIapIdentity parseIdentity(
            String jwtAssertion,
            String rawEmailHeader,
            String rawIdHeader
    ) {
        KeycloakTokenVerifier.ParsedKeycloakIdentity keycloakIdentity =
                KeycloakTokenVerifier.parseIdentity(jwtAssertion, rawIdHeader, rawEmailHeader);

        if (keycloakIdentity != null) {
            return new ParsedIapIdentity(
                    keycloakIdentity.email(),
                    keycloakIdentity.keycloakId(),
                    keycloakIdentity.fullName(),
                    null,
                    keycloakIdentity.claims(),
                    keycloakIdentity.isJwtVerified()
            );
        }
        return null;
    }

    public static ParsedIapIdentity parseJwtPayload(String jwt) {
        KeycloakTokenVerifier.ParsedKeycloakIdentity keycloakIdentity =
                KeycloakTokenVerifier.parseJwtPayload(jwt);

        if (keycloakIdentity != null) {
            return new ParsedIapIdentity(
                    keycloakIdentity.email(),
                    keycloakIdentity.keycloakId(),
                    keycloakIdentity.fullName(),
                    null,
                    keycloakIdentity.claims(),
                    keycloakIdentity.isJwtVerified()
            );
        }
        return null;
    }

    public static String sanitizeIapHeader(String header) {
        return KeycloakTokenVerifier.sanitizeHeader(header);
    }
}
