package org.openjudy.common.dto;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

public record UserConfigurationDTO(
        UUID id,
        UUID userId,
        String theme,
        String language,
        String fontSize,
        boolean highContrast,
        boolean compactView,
        String defaultLandingPage,
        Double playbackRate,
        boolean autoPlayNextSegment,
        boolean autoScrollTranscript,
        boolean showWaveform,
        boolean skipSilence,
        int defaultSkipSeconds,
        boolean autoGenerateAtaDraft,
        boolean autoDetectContradictions,
        String defaultAtaTemplate,
        Double aiTemperature,
        boolean enableCopilotSuggestions,
        String citationStyle,
        boolean emailNotifications,
        boolean hearingCompletedAlert,
        boolean contradictionDetectedAlert,
        boolean ataReadyAlert,
        boolean dailyDigest,
        String digitalCertificateSubject,
        boolean autoSignApprovedMinutes,
        String judgeSignatureTitle,
        Map<String, Object> customPreferences,
        Instant updatedAt
) {
    public static UserConfigurationDTO createDefault(UUID userId) {
        return new UserConfigurationDTO(
                null,
                userId,
                "DARK",
                "pt-BR",
                "MEDIUM",
                false,
                false,
                "DASHBOARD",
                1.0,
                true,
                true,
                true,
                false,
                5,
                true,
                true,
                "PADRAO_CIVEL",
                0.2,
                true,
                "TIMESTAMPS_ONLY",
                true,
                true,
                true,
                true,
                false,
                null,
                false,
                null,
                Map.of(),
                Instant.now()
        );
    }
}
