package org.openjudy.common.dto;

import java.util.UUID;

public record TranscriptBlockDTO(
    UUID id,
    UUID hearingId,
    int blockIndex,
    String title,
    long startTimeMs,
    long endTimeMs,
    String startTimeFormatted,
    String endTimeFormatted,
    int estimatedTokens,
    int segmentCount,
    String summary
) {}
