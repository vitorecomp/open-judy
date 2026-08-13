package org.openjudy.common.events;

import java.time.Instant;
import java.util.UUID;

public record UserConfigUpdatedEvent(
        UUID userId,
        String theme,
        String language,
        String defaultAtaTemplate,
        Instant timestamp
) {
}
