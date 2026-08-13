package org.openjudy.common.security;

import org.openjudy.common.enums.UserRole;

import java.security.Principal;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Security Principal representing an authenticated user via Keycloak OIDC IAM or internal security context.
 */
public class KeycloakPrincipal implements Principal {

    private final UUID userId;
    private final String keycloakId;
    private final String username;
    private final String email;
    private final String fullName;
    private final UserRole role;
    private final String courtJurisdiction;
    private final List<String> permissions;
    private final Map<String, Object> claims;

    public KeycloakPrincipal(
            UUID userId,
            String keycloakId,
            String username,
            String email,
            String fullName,
            UserRole role,
            String courtJurisdiction,
            List<String> permissions,
            Map<String, Object> claims
    ) {
        this.userId = userId;
        this.keycloakId = keycloakId;
        this.username = username != null ? username : (email != null ? email.split("@")[0] : "user");
        this.email = email != null ? email.trim().toLowerCase() : "";
        this.fullName = fullName != null && !fullName.isBlank() ? fullName : this.username;
        this.role = role != null ? role : UserRole.ASSESSOR;
        this.courtJurisdiction = courtJurisdiction;
        this.permissions = permissions != null ? permissions : this.role.getGrantedPermissions();
        this.claims = claims != null ? claims : Collections.emptyMap();
    }

    public KeycloakPrincipal(
            UUID userId,
            String email,
            String keycloakId,
            String fullName,
            UserRole role,
            String courtJurisdiction,
            List<String> permissions,
            Map<String, Object> claims
    ) {
        this(
                userId,
                keycloakId,
                email != null && email.contains("@") ? email.substring(0, email.indexOf('@')) : email,
                email,
                fullName,
                role,
                courtJurisdiction,
                permissions,
                claims
        );
    }

    @Override
    public String getName() {
        return username != null && !username.isBlank() ? username : (email != null ? email : "anonymous");
    }

    public UUID getUserId() {
        return userId;
    }

    public String getKeycloakId() {
        return keycloakId;
    }

    public String getSubjectId() {
        return keycloakId;
    }

    public String getUsername() {
        return username;
    }

    public String getEmail() {
        return email;
    }

    public String getFullName() {
        return fullName;
    }

    public UserRole getRole() {
        return role;
    }

    public String getCourtJurisdiction() {
        return courtJurisdiction;
    }

    public List<String> getPermissions() {
        return permissions;
    }

    public Map<String, Object> getClaims() {
        return claims;
    }

    public boolean hasPermission(String permission) {
        return permissions != null && permissions.contains(permission);
    }

    public boolean isAdmin() {
        return role != null && role.isAdmin();
    }

    public boolean isMagistrado() {
        return role != null && role.isMagistrado();
    }

    public boolean isAssessor() {
        return role != null && role.isAssessor();
    }
}
