package org.openjudy.common.events;

import java.time.Instant;
import java.util.UUID;

/**
 * Event published when legal intelligence (Ata, Summary, Embeddings) is ready.
 */
public record AnalysisGeneratedEvent(
    UUID hearingId,
    UUID minutesId,
    UUID summaryId,
    int embeddedSegmentsCount,
    Instant timestamp
) {
    public AnalysisGeneratedEvent {
        if (timestamp == null) {
            timestamp = Instant.now();
        }
    }
}
