package org.openjudy.common.dto;

import org.openjudy.common.enums.AudioProcessingStatus;
import org.openjudy.common.enums.HearingType;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Complete DTO representing a hearing session dossier.
 */
public record HearingDTO(
    UUID id,
    UUID caseId,
    String caseNumber,
    String courtJurisdiction,
    HearingType hearingType,
    Instant scheduledDateTime,
    AudioProcessingStatus status,
    String audioUrl,
    String audioFilename,
    Double audioDurationSeconds,
    long audioSizeBytes,
    List<ParticipantDTO> participants,
    List<TranscriptSegmentDTO> transcriptSegments,
    AtaDraftDTO ataDraft,
    HearingSummaryDTO summary,
    Instant createdAt,
    Instant updatedAt
) {}
