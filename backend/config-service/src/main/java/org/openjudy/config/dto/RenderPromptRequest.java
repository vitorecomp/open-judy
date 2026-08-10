package org.openjudy.config.dto;

import jakarta.validation.constraints.NotBlank;

import java.util.Map;

public record RenderPromptRequest(
        @NotBlank(message = "O código do prompt é obrigatório")
        String promptCode,

        Map<String, Object> variables
) {
}
