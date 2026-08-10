package org.openjudy.config.dto;

import java.util.List;

public record RenderPromptResponse(
        String promptCode,
        String defaultModel,
        Double defaultTemperature,
        Integer defaultMaxTokens,
        String renderedSystemInstruction,
        String renderedUserPrompt,
        List<String> missingVariables
) {
}
