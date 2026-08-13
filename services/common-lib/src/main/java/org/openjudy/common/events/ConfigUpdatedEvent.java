package org.openjudy.common.events;

import java.time.Instant;

public record ConfigUpdatedEvent(
        String configType,
        String entityCode,
        String action,
        Instant timestamp
) {
}
