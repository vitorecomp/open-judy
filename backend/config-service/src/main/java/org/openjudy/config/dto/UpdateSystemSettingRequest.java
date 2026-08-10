package org.openjudy.config.dto;

import jakarta.validation.constraints.NotBlank;

public record UpdateSystemSettingRequest(
        @NotBlank(message = "O valor da configuração é obrigatório")
        String value,

        String description
) {
}
