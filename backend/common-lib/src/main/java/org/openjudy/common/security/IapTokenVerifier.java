package org.openjudy.common.security;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Collections;
import java.util.Map;
import java.util.logging.Logger;

/**
 * Utility for parsing and verifying Google Cloud Identity-Aware Proxy (IAP) JWT tokens and headers.
 */
public class IapTokenVerifier {

    private static final Logger LOG = Logger.getLogger(IapTokenVerifier.class.getName());
    private static final ObjectMapper MAPPER = new ObjectMapper();

    public static final String EXPECTED_ISSUER = "https://cloud.google.com/iap";

    public record ParsedIapIdentity(
            String email,
            String subjectId,
            String fullName,
            String hostedDomain,
            Map<String, Object> claims,
            boolean isJwtVerified
    ) {}

    /**
     * Extracts and parses the identity from the IAP JWT assertion or headers.
     *
     * @param jwtAssertion The raw X-Goog-IAP-JWT-Assertion header value
     * @param rawEmailHeader The raw X-Goog-Authenticated-User-Email header value
     * @param rawIdHeader The raw X-Goog-Authenticated-User-Id header value
     * @return ParsedIapIdentity or null if no valid credentials found
     */
    public static ParsedIapIdentity parseIdentity(
            String jwtAssertion,
            String rawEmailHeader,
            String rawIdHeader
    ) {
        // 1. Prioritize Cryptographic JWT Assertion if present
        if (jwtAssertion != null && !jwtAssertion.isBlank()) {
            ParsedIapIdentity fromJwt = parseJwtPayload(jwtAssertion);
            if (fromJwt != null) {
                return fromJwt;
            }
        }

        // 2. Fallback to direct IAP headers (or dev proxy)
        if (rawEmailHeader != null && !rawEmailHeader.isBlank()) {
            String sanitizedEmail = sanitizeIapHeader(rawEmailHeader);
            String sanitizedId = sanitizeIapHeader(rawIdHeader);
            String nameFromEmail = generateNameFromEmail(sanitizedEmail);

            return new ParsedIapIdentity(
                    sanitizedEmail,
                    sanitizedId,
                    nameFromEmail,
                    extractDomain(sanitizedEmail),
                    Collections.emptyMap(),
                    false
            );
        }

        return null;
    }

    /**
     * Decodes and validates the payload of an IAP JWT.
     */
    public static ParsedIapIdentity parseJwtPayload(String jwt) {
        try {
            String[] parts = jwt.split("\\.");
            if (parts.length < 2) {
                LOG.warning("Invalid IAP JWT structure");
                return null;
            }

            byte[] payloadBytes = Base64.getUrlDecoder().decode(parts[1]);
            String payloadJson = new String(payloadBytes, StandardCharsets.UTF_8);

            Map<String, Object> claims = MAPPER.readValue(payloadJson, new TypeReference<Map<String, Object>>() {});

            String email = (String) claims.get("email");
            String sub = (String) claims.get("sub");
            String iss = (String) claims.get("iss");
            String hd = (String) claims.get("hd");
            String name = (String) claims.get("name");

            if (email == null && sub != null) {
                email = sub;
            }

            if (email != null) {
                email = sanitizeIapHeader(email);
            }

            if (name == null && email != null) {
                name = generateNameFromEmail(email);
            }

            boolean issuerValid = EXPECTED_ISSUER.equalsIgnoreCase(iss);

            return new ParsedIapIdentity(
                    email,
                    sub,
                    name,
                    hd,
                    claims,
                    issuerValid
            );
        } catch (Exception e) {
            LOG.warning("Failed to parse IAP JWT token: " + e.getMessage());
            return null;
        }
    }

    /**
     * Strips namespace prefixes like "accounts.google.com:" from IAP headers.
     */
    public static String sanitizeIapHeader(String header) {
        if (header == null) {
            return null;
        }
        String trimmed = header.trim();
        int colonIdx = trimmed.indexOf(':');
        if (colonIdx >= 0 && colonIdx < trimmed.length() - 1) {
            return trimmed.substring(colonIdx + 1).trim().toLowerCase();
        }
        return trimmed.toLowerCase();
    }

    private static String extractDomain(String email) {
        if (email == null || !email.contains("@")) {
            return null;
        }
        return email.substring(email.indexOf('@') + 1);
    }

    private static String generateNameFromEmail(String email) {
        if (email == null || email.isBlank()) {
            return "Usuário Judiciário";
        }
        String localPart = email.contains("@") ? email.substring(0, email.indexOf('@')) : email;
        String[] segments = localPart.split("[._-]");
        StringBuilder sb = new StringBuilder();
        for (String segment : segments) {
            if (!segment.isBlank()) {
                sb.append(Character.toUpperCase(segment.charAt(0)))
                  .append(segment.substring(1).toLowerCase())
                  .append(" ");
            }
        }
        return sb.toString().trim();
    }
}
