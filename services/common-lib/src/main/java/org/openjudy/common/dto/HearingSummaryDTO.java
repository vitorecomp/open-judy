package org.openjudy.common.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * AI-generated legal analysis, contradiction detection, and fact timeline.
 */
public record HearingSummaryDTO(
    UUID id,
    UUID hearingId,
    String executiveSummary,
    List<DisputedFactDTO> disputedFacts,
    List<ContradictionDTO> contradictions,
    List<TimelineEventDTO> timeline,
    List<KeyQuoteDTO> keyQuotes,
    Instant generatedAt
) {
    public record DisputedFactDTO(
        String topic,
        String description,
        String plaintiffPosition,
        String defendantPosition,
        List<String> relevantTimestampTags
    ) {}

    public record ContradictionDTO(
        String description,
        String speakerA,
        String statementA,
        long timestampMsA,
        String speakerB,
        String statementB,
        long timestampMsB,
        String legalImpact
    ) {}

    public record TimelineEventDTO(
        String timeOrDate,
        String eventDescription,
        String sourceSpeaker,
        long hearingTimestampMs
    ) {}

    public record KeyQuoteDTO(
        String speakerName,
        String role,
        String quoteText,
        long timestampMs,
        String relevanceTag
    ) {}
}
