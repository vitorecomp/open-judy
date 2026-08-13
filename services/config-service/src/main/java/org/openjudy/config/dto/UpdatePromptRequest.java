package org.openjudy.config.dto;

import org.openjudy.common.enums.PromptCategory;

import java.util.List;

public record UpdatePromptRequest(
        String name,
        String description,
        PromptCategory category,
        String systemInstruction,
        String userPromptTemplate,
        List<String> variables,
        String defaultModel,
        Double defaultTemperature,
        Integer defaultMaxTokens,
        Boolean active
) {
}
