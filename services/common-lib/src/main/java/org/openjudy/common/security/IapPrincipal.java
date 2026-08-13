package org.openjudy.common.security;

import org.openjudy.common.enums.UserRole;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Principal representing an authenticated user.
 * @deprecated Use {@link KeycloakPrincipal} instead.
 */
@Deprecated
public class IapPrincipal extends KeycloakPrincipal {

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
        super(userId, email, subjectId, fullName, role, courtJurisdiction, permissions, claims);
    }
}
