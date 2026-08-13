package org.openjudy.common.dto;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public record DashboardTypeDTO(
        UUID id,
        String code,
        String name,
        String description,
        String targetRole,
        String layoutType,
        List<Map<String, Object>> widgets,
        boolean defaultLanding,
        boolean active,
        Instant createdAt,
        Instant updatedAt
) {
}
