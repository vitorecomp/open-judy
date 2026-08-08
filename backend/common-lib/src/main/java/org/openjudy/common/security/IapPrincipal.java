package org.openjudy.common.security;

import org.openjudy.common.enums.UserRole;

import java.security.Principal;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Principal representing an authenticated user via Google Cloud IAP or internal security context.
 */
public class IapPrincipal implements Principal {

    private final UUID userId;
    private final String email;
    private final String subjectId;
    private final String fullName;
    private final UserRole role;
    private final String courtJurisdiction;
    private final List<String> permissions;
    private final Map<String, Object> claims;

    public IapPrincipal(
            UUID userId,
            String email,
            String subjectId,
            String fullName,
            UserRole role,
            String courtJurisdiction,
            List<String> permissions,
            Map<String, Object> claims
    ) {
        this.userId = userId;
        this.email = email != null ? email.trim().toLowerCase() : "";
        this.subjectId = subjectId;
        this.fullName = fullName != null ? fullName : email;
        this.role = role != null ? role : UserRole.ASSESSOR;
        this.courtJurisdiction = courtJurisdiction;
        this.permissions = permissions != null ? permissions : this.role.getGrantedPermissions();
        this.claims = claims != null ? claims : Collections.emptyMap();
    }

    @Override
    public String getName() {
        return email != null && !email.isBlank() ? email : (fullName != null ? fullName : "anonymous");
    }

    public UUID getUserId() {
        return userId;
    }

    public String getEmail() {
        return email;
    }

    public String getSubjectId() {
        return subjectId;
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
