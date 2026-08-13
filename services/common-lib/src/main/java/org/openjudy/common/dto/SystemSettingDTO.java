package org.openjudy.common.dto;

import java.time.Instant;
import java.util.UUID;

public record SystemSettingDTO(
        UUID id,
        String category,
        String key,
        String value,
        String valueType,
        String description,
        boolean isSecret,
        boolean isReadOnly,
        Instant updatedAt
) {
}
