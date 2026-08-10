package org.openjudy.common.dto;

import org.openjudy.common.enums.PromptCategory;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record PromptTemplateDTO(
        UUID id,
        String code,
        String name,
        String description,
        PromptCategory category,
        String systemInstruction,
        String userPromptTemplate,
        List<String> variables,
        String defaultModel,
        Double defaultTemperature,
        Integer defaultMaxTokens,
        int version,
        boolean active,
        Instant createdAt,
        Instant updatedAt
) {
}
