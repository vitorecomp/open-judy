package org.openjudy.common.dto;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

public record SystemConfigurationDTO(
        UUID id,
        String systemName,
        String logoUrl,
        String geminiModel,
        String geminiEmbeddingModel,
        int maxAudioDurationMinutes,
        Double vectorSimilarityThreshold,
        boolean zeroTrustEnforced,
        int auditLogRetentionDays,
        boolean maintenanceMode,
        String defaultLanguage,
        String audioStorageBucket,
        Map<String, Object> systemProperties,
        Instant updatedAt
) {
    public static SystemConfigurationDTO createDefault() {
        return new SystemConfigurationDTO(
                null,
                "Open Judy",
                null,
                "gemini-4-argon",
                "text-embedding-004",
                240,
                0.75,
                true,
                365,
                false,
                "pt-BR",
                "open-judy-audio-archive",
                Map.of(
                        "copilotMaxHistoryTurns", 20,
                        "enableMultimodalDiarization", true,
                        "alloyDbVectorDimensions", 768
                ),
                Instant.now()
        );
    }
}
