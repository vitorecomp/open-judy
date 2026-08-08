package org.openjudy.common.events;

import java.time.Instant;
import java.util.UUID;

/**
 * Event published when speech-to-text and speaker diarization are finished by the transcription service.
 */
public record TranscriptionCompletedEvent(
    UUID hearingId,
    UUID transcriptId,
    int totalSegments,
    String detectedLanguage,
    Double durationSeconds,
    Double averageConfidence,
    Instant timestamp
) {
    public TranscriptionCompletedEvent {
        if (timestamp == null) {
            timestamp = Instant.now();
        }
    }
}
