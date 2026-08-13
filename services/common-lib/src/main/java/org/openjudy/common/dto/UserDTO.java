package org.openjudy.common.dto;

import org.openjudy.common.enums.UserRole;
import org.openjudy.common.enums.UserStatus;

import java.time.Instant;
import java.util.UUID;

public record UserDTO(
        UUID id,
        String keycloakId,
        String username,
        String email,
        String fullName,
        String documentNumber,
        UserRole role,
        String courtJurisdiction,
        UserStatus status,
        String avatarUrl,
        UserConfigurationDTO configuration,
        Instant createdAt,
        Instant updatedAt
) {
    public UserDTO(
            UUID id,
            String username,
            String email,
            String fullName,
            String documentNumber,
            UserRole role,
            String courtJurisdiction,
            UserStatus status,
            String avatarUrl,
            UserConfigurationDTO configuration,
            Instant createdAt,
            Instant updatedAt
    ) {
        this(id, null, username, email, fullName, documentNumber, role, courtJurisdiction, status, avatarUrl, configuration, createdAt, updatedAt);
    }
}
