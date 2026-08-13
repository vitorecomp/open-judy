package org.openjudy.config.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.openjudy.common.enums.AiModelProvider;
import org.openjudy.common.enums.AiModelType;

import java.util.Map;

public record CreateAiModelRequest(
        @NotBlank(message = "O ID do modelo é obrigatório (ex: gemini-2.0-flash)")
        String modelId,

        @NotBlank(message = "O nome amigável do modelo é obrigatório")
        String name,

        @NotNull(message = "O provedor é obrigatório")
        AiModelProvider provider,

        @NotNull(message = "O tipo do modelo é obrigatório")
        AiModelType modelType,

        String description,

        Integer contextWindowTokens,

        Integer maxOutputTokens,

        Boolean supportsMultimodal,

        Boolean supportsAudio,

        Boolean supportsStreaming,

        Boolean supportsSystemInstruction,

        Double costPer1kInputTokens,

        Double costPer1kOutputTokens,

        Boolean isDefault,

        Boolean active,

        Map<String, Object> parameters
) {
}
