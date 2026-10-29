package org.openjudy.common.dto;

import org.openjudy.common.enums.AudioProcessingStatus;
import org.openjudy.common.enums.HearingType;
import org.openjudy.common.enums.MediaType;

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
    MediaType mediaType,
    String audioUrl,
    String audioFilename,
    Double audioDurationSeconds,
    long audioSizeBytes,
    String mediaUrl,
    String mediaFilename,
    Double mediaDurationSeconds,
    long mediaSizeBytes,
    List<ParticipantDTO> participants,
    List<TranscriptSegmentDTO> transcriptSegments,
    AtaDraftDTO ataDraft,
    HearingSummaryDTO summary,
    String promptVersion,
    String pipelineVersion,
    Instant createdAt,
    Instant updatedAt
) {
    public HearingDTO(
        UUID id,
        UUID caseId,
        String caseNumber,
        String courtJurisdiction,
        HearingType hearingType,
        Instant scheduledDateTime,
        AudioProcessingStatus status,
        MediaType mediaType,
        String audioUrl,
        String audioFilename,
        Double audioDurationSeconds,
        long audioSizeBytes,
        String mediaUrl,
        String mediaFilename,
        Double mediaDurationSeconds,
        long mediaSizeBytes,
        List<ParticipantDTO> participants,
        List<TranscriptSegmentDTO> transcriptSegments,
        AtaDraftDTO ataDraft,
        HearingSummaryDTO summary,
        Instant createdAt,
        Instant updatedAt
    ) {
        this(
            id,
            caseId,
            caseNumber,
            courtJurisdiction,
            hearingType,
            scheduledDateTime,
            status,
            mediaType,
            audioUrl,
            audioFilename,
            audioDurationSeconds,
            audioSizeBytes,
            mediaUrl,
            mediaFilename,
            mediaDurationSeconds,
            mediaSizeBytes,
            participants,
            transcriptSegments,
            ataDraft,
            summary,
            "PROMPT_AUDIO_VIDEO_TRANSCRIPTION v3 (OPT_V1_DIARIZATION_SURGICAL)",
            "v3.2-VAD-SYNC (gemini-3.8-flash)",
            createdAt,
            updatedAt
        );
    }

    public HearingDTO(
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
    ) {
        this(
            id,
            caseId,
            caseNumber,
            courtJurisdiction,
            hearingType,
            scheduledDateTime,
            status,
            MediaType.fromFilename(audioFilename),
            audioUrl,
            audioFilename,
            audioDurationSeconds,
            audioSizeBytes,
            audioUrl,
            audioFilename,
            audioDurationSeconds,
            audioSizeBytes,
            participants,
            transcriptSegments,
            ataDraft,
            summary,
            "PROMPT_AUDIO_VIDEO_TRANSCRIPTION v3 (OPT_V1_DIARIZATION_SURGICAL)",
            "v3.2-VAD-SYNC (gemini-3.8-flash)",
            createdAt,
            updatedAt
        );
    }
}
