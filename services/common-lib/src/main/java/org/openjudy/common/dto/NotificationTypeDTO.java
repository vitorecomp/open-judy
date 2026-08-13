package org.openjudy.common.dto;

import org.openjudy.common.enums.NotificationCategory;
import org.openjudy.common.enums.NotificationChannel;
import org.openjudy.common.enums.NotificationPriority;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record NotificationTypeDTO(
        UUID id,
        String code,
        String name,
        String description,
        NotificationCategory category,
        NotificationPriority defaultPriority,
        List<NotificationChannel> supportedChannels,
        String templateTitle,
        String templateBody,
        boolean allowUserOverride,
        boolean active,
        Instant createdAt,
        Instant updatedAt
) {
}
