package org.openjudy.common.dto;

import org.openjudy.common.enums.ParticipantRole;

import java.util.UUID;

/**
 * Data Transfer Object for an individual spoken segment in a hearing transcript.
 */
public record TranscriptSegmentDTO(
    UUID id,
    int segmentIndex,
    long startTimeMs,
    long endTimeMs,
    String startTimeFormatted,
    String endTimeFormatted,
    ParticipantRole speakerRole,
    String speakerName,
    String text,
    Double confidenceScore,
    boolean isKeyStatement,
    String topicTag
) {
    public static String formatMillis(long millis) {
        long totalSeconds = millis / 1000;
        long hours = totalSeconds / 3600;
        long minutes = (totalSeconds % 3600) / 60;
        long seconds = totalSeconds % 60;
        if (hours > 0) {
            return String.format("%02d:%02d:%02d", hours, minutes, seconds);
        }
        return String.format("%02d:%02d", minutes, seconds);
    }
}
