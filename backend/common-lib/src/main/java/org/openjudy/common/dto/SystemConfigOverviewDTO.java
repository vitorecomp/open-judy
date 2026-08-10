package org.openjudy.common.dto;

import java.time.Instant;
import java.util.List;
import java.util.Map;

public record SystemConfigOverviewDTO(
        List<PromptTemplateDTO> prompts,
        List<AiModelDTO> models,
        List<DashboardTypeDTO> dashboards,
        List<NotificationTypeDTO> notifications,
        Map<String, String> settings,
        Instant generatedAt
) {
}
