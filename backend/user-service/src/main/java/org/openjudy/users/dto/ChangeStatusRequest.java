package org.openjudy.users.dto;

import jakarta.validation.constraints.NotNull;
import org.openjudy.common.enums.UserStatus;

public record ChangeStatusRequest(
        @NotNull(message = "O novo status é obrigatório")
        UserStatus status,

        String reason
) {
}
