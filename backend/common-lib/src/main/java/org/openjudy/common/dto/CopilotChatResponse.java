package org.openjudy.common.dto;

import java.util.List;

/**
 * Response from Judicial Copilot Chat with citations.
 */
public record CopilotChatResponse(
    String answer,
    List<CitationDTO> citations
) {
    public record CitationDTO(
        int segmentIndex,
        long startTimeMs,
        long endTimeMs,
        String timestampFormatted,
        String speakerName,
        String snippet,
        double relevanceScore
    ) {}
}
