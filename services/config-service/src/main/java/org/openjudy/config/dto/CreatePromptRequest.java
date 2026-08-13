package org.openjudy.config.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.openjudy.common.enums.PromptCategory;

import java.util.List;

public record CreatePromptRequest(
        @NotBlank(message = "O código do prompt é obrigatório (ex: PROMPT_ATA_GENERATION)")
        String code,

        @NotBlank(message = "O nome do prompt é obrigatório")
        String name,

        String description,

        @NotNull(message = "A categoria do prompt é obrigatória")
        PromptCategory category,

        String systemInstruction,

        @NotBlank(message = "O template de prompt do usuário é obrigatório")
        String userPromptTemplate,

        List<String> variables,

        String defaultModel,

        Double defaultTemperature,

        Integer defaultMaxTokens,

        Boolean active
) {
}
