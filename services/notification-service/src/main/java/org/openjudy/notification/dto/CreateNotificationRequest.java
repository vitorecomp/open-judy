package org.openjudy.notification.dto;

import org.openjudy.common.enums.NotificationCategory;
import org.openjudy.common.enums.NotificationPriority;
import org.openjudy.common.enums.UserRole;

import java.util.UUID;

public record CreateNotificationRequest(
    UUID userId,
    UserRole targetRole,
    String title,
    String message,
    NotificationCategory category,
    NotificationPriority priority,
    String actionUrl,
    UUID hearingId
) {}
