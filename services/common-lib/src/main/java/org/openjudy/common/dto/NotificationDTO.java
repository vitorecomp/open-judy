package org.openjudy.common.dto;

import org.openjudy.common.enums.NotificationCategory;
import org.openjudy.common.enums.NotificationPriority;
import org.openjudy.common.enums.UserRole;

import java.time.Instant;
import java.util.UUID;

public record NotificationDTO(
    UUID id,
    UUID userId,
    UserRole targetRole,
    String title,
    String message,
    NotificationCategory category,
    NotificationPriority priority,
    boolean read,
    String actionUrl,
    Instant createdAt,
    Instant readAt
) {
    public NotificationDTO(
        UUID id,
        UUID userId,
        UserRole targetRole,
        String title,
        String message,
        NotificationCategory category,
        NotificationPriority priority,
        boolean read,
        String actionUrl,
        Instant createdAt
    ) {
        this(id, userId, targetRole, title, message, category, priority, read, actionUrl, createdAt, null);
    }
}
