package org.openjudy.config.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.openjudy.common.enums.NotificationCategory;
import org.openjudy.common.enums.NotificationChannel;
import org.openjudy.common.enums.NotificationPriority;

import java.util.List;

public record CreateNotificationTypeRequest(
        @NotBlank(message = "O código da notificação é obrigatório (ex: NOTIF_AUDIO_TRANSCRIPTION_COMPLETED)")
        String code,

        @NotBlank(message = "O nome da notificação é obrigatório")
        String name,

        String description,

        @NotNull(message = "A categoria da notificação é obrigatória")
        NotificationCategory category,

        NotificationPriority defaultPriority,

        List<NotificationChannel> supportedChannels,

        @NotBlank(message = "O título do modelo da notificação é obrigatório")
        String templateTitle,

        @NotBlank(message = "O corpo do modelo da notificação é obrigatório")
        String templateBody,

        Boolean allowUserOverride,

        Boolean active
) {
}
