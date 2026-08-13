package org.openjudy.config.dto;

import org.openjudy.common.enums.NotificationCategory;
import org.openjudy.common.enums.NotificationChannel;
import org.openjudy.common.enums.NotificationPriority;

import java.util.List;

public record UpdateNotificationTypeRequest(
        String name,
        String description,
        NotificationCategory category,
        NotificationPriority defaultPriority,
        List<NotificationChannel> supportedChannels,
        String templateTitle,
        String templateBody,
        Boolean allowUserOverride,
        Boolean active
) {
}
