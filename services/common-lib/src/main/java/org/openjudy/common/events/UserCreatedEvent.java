package org.openjudy.common.events;

import org.openjudy.common.enums.UserRole;
import java.time.Instant;
import java.util.UUID;

public record UserCreatedEvent(
        UUID userId,
        String username,
        String email,
        String fullName,
        UserRole role,
        Instant timestamp
) {
}
