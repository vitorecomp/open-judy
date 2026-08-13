package org.openjudy.users.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.openjudy.common.enums.UserRole;

public record CreateUserRequest(
        @NotBlank(message = "O username é obrigatório")
        String username,

        @NotBlank(message = "O email é obrigatório")
        @Email(message = "Formato de email inválido")
        String email,

        @NotBlank(message = "O nome completo é obrigatório")
        String fullName,

        String documentNumber,

        @NotNull(message = "O papel processual/sistema (role) é obrigatório")
        UserRole role,

        String courtJurisdiction,
        String avatarUrl,
        UpdateUserConfigRequest initialConfiguration
) {
}
