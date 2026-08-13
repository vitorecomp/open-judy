package org.openjudy.config.dto;

import java.util.List;
import java.util.Map;

public record UpdateDashboardTypeRequest(
        String name,
        String description,
        String targetRole,
        String layoutType,
        List<Map<String, Object>> widgets,
        Boolean defaultLanding,
        Boolean active
) {
}
