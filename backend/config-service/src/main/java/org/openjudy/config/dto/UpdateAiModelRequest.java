package org.openjudy.config.dto;

import org.openjudy.common.enums.AiModelProvider;
import org.openjudy.common.enums.AiModelType;

import java.util.Map;

public record UpdateAiModelRequest(
        String name,
        AiModelProvider provider,
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
