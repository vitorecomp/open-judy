package org.openjudy.config.service;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.openjudy.common.dto.AiModelDTO;
import org.openjudy.common.dto.DashboardTypeDTO;
import org.openjudy.common.dto.NotificationTypeDTO;
import org.openjudy.common.dto.PromptTemplateDTO;
import org.openjudy.common.dto.SystemConfigOverviewDTO;
import org.openjudy.common.dto.SystemSettingDTO;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@ApplicationScoped
public class ConfigOverviewService {

    @Inject
    PromptTemplateService promptService;

    @Inject
    AiModelService modelService;

    @Inject
    DashboardTypeService dashboardService;

    @Inject
    NotificationTypeService notificationService;

    @Inject
    SystemSettingService settingService;

    public SystemConfigOverviewDTO getOverview() {
        List<PromptTemplateDTO> prompts = promptService.listPrompts(0, 100, null, true, null);
        List<AiModelDTO> models = modelService.listModels(null, null, true);
        List<DashboardTypeDTO> dashboards = dashboardService.listDashboards(null, true);
        List<NotificationTypeDTO> notifications = notificationService.listNotifications(null, null, true);

        Map<String, String> settingsMap = settingService.listSettings(null).stream()
                .filter(s -> !s.isSecret())
                .collect(Collectors.toMap(SystemSettingDTO::key, SystemSettingDTO::value, (a, b) -> a));

        return new SystemConfigOverviewDTO(
                prompts,
                models,
                dashboards,
                notifications,
                settingsMap,
                Instant.now()
        );
    }
}
