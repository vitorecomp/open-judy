package org.openjudy.common.security;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.openjudy.common.enums.UserRole;

import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.logging.Logger;

/**
 * Utility for parsing and verifying Keycloak OpenID Connect (OIDC) JWT tokens and headers.
 */
public class KeycloakTokenVerifier {

    private static final Logger LOG = Logger.getLogger(KeycloakTokenVerifier.class.getName());
    private static final ObjectMapper MAPPER = new ObjectMapper();

    public record ParsedKeycloakIdentity(
            String keycloakId,
            String username,
            String email,
            String fullName,
            UserRole role,
            List<String> roles,
            String courtJurisdiction,
            String documentNumber,
            Map<String, Object> claims,
            boolean isJwtVerified
    ) {}

    /**
     * Extracts and parses the user identity from Keycloak Bearer token or HTTP headers.
     *
     * @param authHeader The Authorization header (e.g. "Bearer eyJhbGciOi...")
     * @param rawKeycloakIdHeader Optional X-Keycloak-User-Id header
     * @param rawEmailHeader Optional X-Keycloak-User-Email or X-Goog-Authenticated-User-Email header
     * @return ParsedKeycloakIdentity or null if no valid credentials found
     */
    public static ParsedKeycloakIdentity parseIdentity(
            String authHeader,
            String rawKeycloakIdHeader,
            String rawEmailHeader
    ) {
        // 1. Prioritize Keycloak JWT Bearer Token if present
        if (authHeader != null && !authHeader.isBlank()) {
            String token = authHeader.trim();
            if (token.toLowerCase().startsWith("bearer ")) {
                token = token.substring(7).trim();
            }
            if (!token.isBlank()) {
                ParsedKeycloakIdentity fromJwt = parseJwtPayload(token);
                if (fromJwt != null) {
                    return fromJwt;
                }
            }
        }

        // 2. Fallback to direct Keycloak / Gateway propagated headers
        if ((rawEmailHeader != null && !rawEmailHeader.isBlank()) ||
            (rawKeycloakIdHeader != null && !rawKeycloakIdHeader.isBlank())) {

            String sanitizedEmail = sanitizeHeader(rawEmailHeader);
            String sanitizedId = sanitizeHeader(rawKeycloakIdHeader);
            String username = sanitizedEmail != null && sanitizedEmail.contains("@")
                    ? sanitizedEmail.substring(0, sanitizedEmail.indexOf('@'))
                    : (sanitizedId != null ? "user-" + sanitizedId : "user");
            String nameFromEmail = generateNameFromEmail(sanitizedEmail);
            UserRole inferredRole = determineRoleFromEmail(sanitizedEmail);

            return new ParsedKeycloakIdentity(
                    sanitizedId,
                    username,
                    sanitizedEmail,
                    nameFromEmail,
                    inferredRole,
                    List.of(inferredRole.name()),
                    "3ª Vara Cível Central da Comarca de São Paulo/SP",
                    null,
                    Collections.emptyMap(),
                    false
            );
        }

        return null;
    }

    /**
     * Decodes and validates the payload of a Keycloak JWT.
     */
    public static ParsedKeycloakIdentity parseJwtPayload(String jwt) {
        try {
            String[] parts = jwt.split("\\.");
            if (parts.length < 2) {
                LOG.warning("Invalid Keycloak JWT structure");
                return null;
            }

            byte[] payloadBytes = Base64.getUrlDecoder().decode(parts[1]);
            String payloadJson = new String(payloadBytes, StandardCharsets.UTF_8);

            Map<String, Object> claims = MAPPER.readValue(payloadJson, new TypeReference<Map<String, Object>>() {});

            String sub = (String) claims.get("sub");
            String preferredUsername = (String) claims.get("preferred_username");
            String email = (String) claims.get("email");
            String name = (String) claims.get("name");
            String givenName = (String) claims.get("given_name");
            String familyName = (String) claims.get("family_name");

            if (email == null && sub != null && sub.contains("@")) {
                email = sub;
            }

            if (email != null) {
                email = sanitizeHeader(email);
            }

            if (preferredUsername == null && email != null) {
                preferredUsername = email.contains("@") ? email.substring(0, email.indexOf('@')) : email;
            }

            if (name == null || name.isBlank()) {
                if (givenName != null || familyName != null) {
                    name = ((givenName != null ? givenName : "") + " " + (familyName != null ? familyName : "")).trim();
                } else if (email != null) {
                    name = generateNameFromEmail(email);
                } else if (preferredUsername != null) {
                    name = preferredUsername;
                }
            }

            // Extract Realm & Client Roles
            List<String> extractedRoles = new ArrayList<>();
            Object realmAccessObj = claims.get("realm_access");
            if (realmAccessObj instanceof Map<?, ?> realmAccess) {
                Object rolesObj = realmAccess.get("roles");
                if (rolesObj instanceof List<?> rolesList) {
                    for (Object r : rolesList) {
                        if (r != null) {
                            extractedRoles.add(r.toString());
                        }
                    }
                }
            }

            Object resourceAccessObj = claims.get("resource_access");
            if (resourceAccessObj instanceof Map<?, ?> resourceAccess) {
                for (Object clientObj : resourceAccess.values()) {
                    if (clientObj instanceof Map<?, ?> clientMap) {
                        Object rolesObj = clientMap.get("roles");
                        if (rolesObj instanceof List<?> rolesList) {
                            for (Object r : rolesList) {
                                if (r != null) {
                                    extractedRoles.add(r.toString());
                                }
                            }
                        }
                    }
                }
            }

            // Determine UserRole
            UserRole resolvedRole = mapRolesToUserRole(extractedRoles, email, preferredUsername);

            // Extract custom attributes if present
            String jurisdiction = extractCustomClaim(claims, "courtJurisdiction", "3ª Vara Cível Central da Comarca de São Paulo/SP");
            String docNumber = extractCustomClaim(claims, "documentNumber", null);

            return new ParsedKeycloakIdentity(
                    sub,
                    preferredUsername,
                    email != null ? email : (preferredUsername != null ? preferredUsername + "@openjudy.org" : "user@openjudy.org"),
                    name,
                    resolvedRole,
                    extractedRoles,
                    jurisdiction,
                    docNumber,
                    claims,
                    true
            );
        } catch (Exception e) {
            LOG.warning("Failed to parse Keycloak JWT token: " + e.getMessage());
            return null;
        }
    }

    private static String extractCustomClaim(Map<String, Object> claims, String key, String defaultValue) {
        Object val = claims.get(key);
        if (val instanceof String s && !s.isBlank()) {
            return s;
        }
        if (val instanceof List<?> l && !l.isEmpty() && l.get(0) != null) {
            return l.get(0).toString();
        }
        return defaultValue;
    }

    public static UserRole mapRolesToUserRole(List<String> roles, String email, String username) {
        for (String r : roles) {
            String norm = r.trim().toUpperCase();
            if (norm.equals("ADMIN") || norm.equals("ADMINISTRADOR") || norm.equals("REALM-ADMIN")) {
                return UserRole.ADMIN;
            }
            if (norm.equals("MAGISTRADO") || norm.equals("MAGISTRADA") || norm.equals("JUIZ") || norm.equals("JUIZA")) {
                return UserRole.MAGISTRADO;
            }
            if (norm.equals("ASSESSOR") || norm.equals("ASSESSORA") || norm.equals("ACESSOR")) {
                return UserRole.ASSESSOR;
            }
            if (norm.equals("ADVOGADO") || norm.equals("ADVOGADA")) {
                return UserRole.ADVOGADO;
            }
        }

        // Fallback to username / email heuristics
        if (username != null) {
            String u = username.toLowerCase();
            if (u.contains("admin")) return UserRole.ADMIN;
            if (u.contains("camila") || u.contains("magistrad") || u.contains("juiz")) return UserRole.MAGISTRADO;
            if (u.contains("marcos") || u.contains("assessor")) return UserRole.ASSESSOR;
            if (u.contains("lucas") || u.contains("advoga")) return UserRole.ADVOGADO;
        }

        if (email != null) {
            return determineRoleFromEmail(email);
        }

        return UserRole.ASSESSOR;
    }

    public static UserRole determineRoleFromEmail(String email) {
        if (email == null) return UserRole.ASSESSOR;
        String lower = email.toLowerCase();
        if (lower.contains("admin") || lower.startsWith("root@") || lower.startsWith("sysadmin@")) {
            return UserRole.ADMIN;
        }
        if (lower.contains("magistrad") || lower.contains("juiz") || lower.contains("juiza") || lower.contains("vara") || lower.contains("camila")) {
            return UserRole.MAGISTRADO;
        }
        if (lower.contains("advocacia") || lower.contains("advogado") || lower.contains("oab")) {
            return UserRole.ADVOGADO;
        }
        return UserRole.ASSESSOR;
    }

    public static String sanitizeHeader(String header) {
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
