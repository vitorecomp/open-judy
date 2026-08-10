package org.openjudy.common.dto;

import org.openjudy.common.enums.AiModelProvider;
import org.openjudy.common.enums.AiModelType;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

public record AiModelDTO(
        UUID id,
        String modelId,
        String name,
        AiModelProvider provider,
        AiModelType modelType,
        String description,
        int contextWindowTokens,
        int maxOutputTokens,
        boolean supportsMultimodal,
        boolean supportsAudio,
        boolean supportsStreaming,
        boolean supportsSystemInstruction,
        Double costPer1kInputTokens,
        Double costPer1kOutputTokens,
        boolean isDefault,
        boolean active,
        Map<String, Object> parameters,
        Instant createdAt,
        Instant updatedAt
) {
}
