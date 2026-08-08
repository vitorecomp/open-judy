package org.openjudy.users.dto;

import jakarta.validation.constraints.NotBlank;
import org.openjudy.common.enums.UserRole;

public record UpdateUserRequest(
        @NotBlank(message = "O nome completo não pode ser vazio")
        String fullName,

        String documentNumber,
        UserRole role,
        String courtJurisdiction,
        String avatarUrl
) {
}
