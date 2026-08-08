package org.openjudy.users.dto;

import java.util.Map;

public record UpdateUserConfigRequest(
        String theme,
        String language,
        String fontSize,
        Boolean highContrast,
        Boolean compactView,
        String defaultLandingPage,
        Double playbackRate,
        Boolean autoPlayNextSegment,
        Boolean autoScrollTranscript,
        Boolean showWaveform,
        Boolean skipSilence,
        Integer defaultSkipSeconds,
        Boolean autoGenerateAtaDraft,
        Boolean autoDetectContradictions,
        String defaultAtaTemplate,
        Double aiTemperature,
        Boolean enableCopilotSuggestions,
        String citationStyle,
        Boolean emailNotifications,
        Boolean hearingCompletedAlert,
        Boolean contradictionDetectedAlert,
        Boolean ataReadyAlert,
        Boolean dailyDigest,
        String digitalCertificateSubject,
        Boolean autoSignApprovedMinutes,
        String judgeSignatureTitle,
        Map<String, Object> customPreferences
) {
}
