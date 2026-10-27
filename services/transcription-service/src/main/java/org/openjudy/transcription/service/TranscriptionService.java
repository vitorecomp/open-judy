package org.openjudy.transcription.service;

import io.agroal.api.AgroalDataSource;
import io.smallrye.reactive.messaging.annotations.Broadcast;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.reactive.messaging.Channel;
import org.eclipse.microprofile.reactive.messaging.Emitter;
import org.openjudy.common.dto.TranscriptSegmentDTO;
import org.openjudy.common.enums.AudioProcessingStatus;
import org.openjudy.common.enums.ParticipantRole;
import org.openjudy.common.events.AudioUploadedEvent;
import org.openjudy.common.events.TranscriptionCompletedEvent;
import org.openjudy.transcription.client.GeminiAudioClient;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import org.openjudy.transcription.producer.RabbitMqTranscriptionProducer;

@ApplicationScoped
public class TranscriptionService {

    @Inject
    GeminiAudioClient geminiAudioClient;

    @Inject
    RabbitMqTranscriptionProducer rabbitMqProducer;

    @Inject
    AgroalDataSource dataSource;

    @Inject
    @Channel("transcription-completed")
    @Broadcast
    Emitter<TranscriptionCompletedEvent> completedEmitter;

    public void processAudioUploaded(AudioUploadedEvent event) {
        UUID hearingId = event.hearingId();
        try {
            // Enqueue job into RabbitMQ for the Python Transcription Pipeline
            rabbitMqProducer.enqueueJob(
                    hearingId,
                    event.caseNumber(),
                    event.storagePath(),
                    event.storageUrl(),
                    event.originalFilename(),
                    event.mimeType(),
                    event.mediaType()
            );
        } catch (Exception e) {
            // Fallback to local synchronous processing if RabbitMQ is temporarily unavailable
            processDirectSync(event);
        }
    }

    public void enqueueHearingTranscription(UUID hearingId, String caseNumber, String mediaUrl, String filename, String mimeType, org.openjudy.common.enums.MediaType mediaType) {
        try {
            rabbitMqProducer.enqueueJob(
                    hearingId,
                    caseNumber,
                    mediaUrl,
                    mediaUrl,
                    filename,
                    mimeType,
                    mediaType
            );
        } catch (Exception e) {
            processDirectSync(new AudioUploadedEvent(
                    hearingId,
                    caseNumber,
                    UUID.randomUUID(),
                    mediaUrl,
                    mediaUrl,
                    filename,
                    mimeType,
                    0L,
                    120.0,
                    mediaType,
                    Instant.now()
            ));
        }
    }

    public void processDirectSync(AudioUploadedEvent event) {
        UUID hearingId = event.hearingId();

        try (Connection conn = dataSource.getConnection()) {
            // 1. Update hearing status to PROCESSING_TRANSCRIPTION
            try (PreparedStatement ps = conn.prepareStatement("UPDATE tb_hearings SET status = ? WHERE id = ?")) {
                ps.setString(1, AudioProcessingStatus.PROCESSING_TRANSCRIPTION.name());
                ps.setObject(2, hearingId);
                ps.executeUpdate();
            }

            // 2. Call Gemini for Audio Transcription & Diarization
            GeminiAudioClient.GeminiTranscriptResult result = geminiAudioClient.transcribeAudio(
                    hearingId, event.caseNumber(), event.storagePath()
            );

            // 3. Save or update tb_transcripts
            UUID transcriptId = UUID.randomUUID();
            try (PreparedStatement ps = conn.prepareStatement(
                    "INSERT INTO tb_transcripts (id, hearing_id, detected_language, total_segments, average_confidence, engine_used) " +
                    "VALUES (?, ?, ?, ?, ?, ?) " +
                    "ON CONFLICT (hearing_id) DO UPDATE SET " +
                    "detected_language = EXCLUDED.detected_language, " +
                    "total_segments = EXCLUDED.total_segments, " +
                    "average_confidence = EXCLUDED.average_confidence, " +
                    "updated_at = CURRENT_TIMESTAMP " +
                    "RETURNING id")) {
                ps.setObject(1, transcriptId);
                ps.setObject(2, hearingId);
                ps.setString(3, result.language());
                ps.setInt(4, result.segments().size());
                ps.setDouble(5, result.averageConfidence());
                ps.setString(6, "GEMINI-2.0-FLASH");
                
                try (ResultSet rs = ps.executeQuery()) {
                    if (rs.next()) {
                        transcriptId = (UUID) rs.getObject(1);
                    }
                }
            }

            // 4. Clean existing segments if re-transcribing
            try (PreparedStatement ps = conn.prepareStatement("DELETE FROM tb_transcript_segments WHERE transcript_id = ?")) {
                ps.setObject(1, transcriptId);
                ps.executeUpdate();
            }

            // 5. Insert segments
            String insertSegmentSql = "INSERT INTO tb_transcript_segments " +
                    "(id, transcript_id, segment_index, start_time_ms, end_time_ms, speaker_role, speaker_name, text, confidence_score, is_key_statement, topic_tag) " +
                    "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
            
            try (PreparedStatement ps = conn.prepareStatement(insertSegmentSql)) {
                for (GeminiAudioClient.SegmentResult seg : result.segments()) {
                    ps.setObject(1, UUID.randomUUID());
                    ps.setObject(2, transcriptId);
                    ps.setInt(3, seg.segmentIndex());
                    ps.setLong(4, seg.startTimeMs());
                    ps.setLong(5, seg.endTimeMs());
                    ps.setString(6, seg.speakerRole().name());
                    ps.setString(7, seg.speakerName());
                    ps.setString(8, seg.text());
                    ps.setDouble(9, seg.confidence());
                    ps.setBoolean(10, seg.isKeyStatement());
                    ps.setString(11, seg.topicTag());
                    ps.addBatch();
                }
                ps.executeBatch();
            }

            // 6. Update hearing status to TRANSCRIPTION_COMPLETED
            try (PreparedStatement ps = conn.prepareStatement("UPDATE tb_hearings SET status = ? WHERE id = ?")) {
                ps.setString(1, AudioProcessingStatus.TRANSCRIPTION_COMPLETED.name());
                ps.setObject(2, hearingId);
                ps.executeUpdate();
            }

            // 7. Publish TranscriptionCompletedEvent to Kafka (non-blocking fallback)
            try {
                TranscriptionCompletedEvent completedEvent = new TranscriptionCompletedEvent(
                        hearingId,
                        transcriptId,
                        result.segments().size(),
                        result.language(),
                        event.durationSeconds(),
                        result.averageConfidence(),
                        Instant.now()
                );
                completedEmitter.send(completedEvent);
            } catch (Exception ignored) {
            }

        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    public List<TranscriptSegmentDTO> getSegmentsByHearingId(UUID hearingId) {
        return getSegmentsByHearingId(hearingId, null);
    }

    public List<TranscriptSegmentDTO> getSegmentsByHearingId(UUID hearingId, Integer blockIndex) {
        List<TranscriptSegmentDTO> list = new ArrayList<>();
        StringBuilder sql = new StringBuilder(
                "SELECT s.id, s.segment_index, s.start_time_ms, s.end_time_ms, s.speaker_role, s.speaker_name, " +
                "s.text, s.confidence_score, s.is_key_statement, s.topic_tag, s.block_index " +
                "FROM tb_transcript_segments s " +
                "JOIN tb_transcripts t ON s.transcript_id = t.id " +
                "WHERE t.hearing_id = ? "
        );

        if (blockIndex != null && blockIndex > 0) {
            sql.append("AND s.block_index = ? ");
        }
        sql.append("ORDER BY s.segment_index ASC");

        try (Connection conn = dataSource.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql.toString())) {
            ps.setObject(1, hearingId);
            if (blockIndex != null && blockIndex > 0) {
                ps.setInt(2, blockIndex);
            }
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    long startMs = rs.getLong("start_time_ms");
                    long endMs = rs.getLong("end_time_ms");
                    int bIdx = rs.getInt("block_index");
                    list.add(new TranscriptSegmentDTO(
                            (UUID) rs.getObject("id"),
                            rs.getInt("segment_index"),
                            startMs,
                            endMs,
                            TranscriptSegmentDTO.formatMillis(startMs),
                            TranscriptSegmentDTO.formatMillis(endMs),
                            ParticipantRole.valueOf(rs.getString("speaker_role")),
                            rs.getString("speaker_name"),
                            rs.getString("text"),
                            rs.getDouble("confidence_score"),
                            rs.getBoolean("is_key_statement"),
                            rs.getString("topic_tag"),
                            bIdx > 0 ? bIdx : 1
                    ));
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return list;
    }

    public List<org.openjudy.common.dto.TranscriptBlockDTO> getBlocksByHearingId(UUID hearingId) {
        List<org.openjudy.common.dto.TranscriptBlockDTO> list = new ArrayList<>();
        String sql = "SELECT id, hearing_id, block_index, title, start_time_ms, end_time_ms, start_time_formatted, " +
                     "end_time_formatted, estimated_tokens, segment_count, summary " +
                     "FROM tb_transcript_blocks WHERE hearing_id = ? ORDER BY block_index ASC";

        try (Connection conn = dataSource.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setObject(1, hearingId);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    list.add(new org.openjudy.common.dto.TranscriptBlockDTO(
                            (UUID) rs.getObject("id"),
                            (UUID) rs.getObject("hearing_id"),
                            rs.getInt("block_index"),
                            rs.getString("title"),
                            rs.getLong("start_time_ms"),
                            rs.getLong("end_time_ms"),
                            rs.getString("start_time_formatted"),
                            rs.getString("end_time_formatted"),
                            rs.getInt("estimated_tokens"),
                            rs.getInt("segment_count"),
                            rs.getString("summary")
                    ));
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return list;
    }

    public String getBlockContextText(UUID hearingId, Integer blockIndex) {
        return getMultiBlockContextText(hearingId, blockIndex != null ? List.of(blockIndex) : List.of(), false);
    }

    public String getMultiBlockContextText(UUID hearingId, List<Integer> requestedBlockIndices, boolean useFullTranscript) {
        StringBuilder sb = new StringBuilder();
        List<org.openjudy.common.dto.TranscriptBlockDTO> allBlocks = getBlocksByHearingId(hearingId);

        if (useFullTranscript) {
            List<TranscriptSegmentDTO> allSegments = getSegmentsByHearingId(hearingId, null);
            // Estimate tokens in text: ~1 token per 4 characters
            int totalChars = allSegments.stream().mapToInt(s -> s.text().length()).sum();
            int estimatedTextTokens = totalChars / 4;

            if (estimatedTextTokens > 512000) {
                sb.append("=== TRANSCRIÇÃO EXTENSA (> 512k tokens) - PARTICIONADA EM BLOCOS DE 256k TOKENS ===\n");
                sb.append("Aviso: Devido à extensão da transcrição (estimada em ").append(estimatedTextTokens)
                  .append(" tokens), o contexto foi particionado para manter máxima precisão.\n\n");
                // Limit to first 2 blocks (~512k tokens budget)
                List<Integer> firstTwo = List.of(1, 2);
                for (Integer bIdx : firstTwo) {
                    appendBlockContent(sb, hearingId, bIdx, allBlocks);
                }
            } else {
                sb.append("=== CONTEXTO DA TRANSCRIÇÃO COMPLETA (< 512k tokens: ~").append(Math.max(estimatedTextTokens, 1500)).append(" tokens) ===\n");
                for (TranscriptSegmentDTO s : allSegments) {
                    sb.append("[").append(s.startTimeFormatted()).append(" - ").append(s.endTimeFormatted()).append("] ")
                      .append(s.speakerRole()).append(" (").append(s.speakerName()).append("): ")
                      .append(s.text()).append("\n");
                }
            }
            return sb.toString();
        }

        // Limit user selection to a maximum of 2 blocks
        List<Integer> selectedIndices = (requestedBlockIndices != null ? requestedBlockIndices : List.<Integer>of())
                .stream()
                .filter(i -> i != null && i > 0)
                .distinct()
                .limit(2) // Strictly enforce max 2 blocks limit
                .toList();

        if (selectedIndices.isEmpty()) {
            return getMultiBlockContextText(hearingId, List.of(), true);
        }

        int totalTokens = 0;
        for (Integer bIdx : selectedIndices) {
            totalTokens += allBlocks.stream()
                    .filter(b -> b.blockIndex() == bIdx)
                    .mapToInt(org.openjudy.common.dto.TranscriptBlockDTO::estimatedTokens)
                    .findFirst()
                    .orElse(256000);
        }

        sb.append("=== CONTEXTO MULTIMODAL CONSOLIDADO (").append(selectedIndices.size())
          .append(" de máx 2 Blocos Selecionados | ~").append(Math.round(totalTokens / 1000.0)).append("k tokens) ===\n\n");

        for (Integer bIdx : selectedIndices) {
            appendBlockContent(sb, hearingId, bIdx, allBlocks);
        }

        return sb.toString();
    }

    private void appendBlockContent(StringBuilder sb, UUID hearingId, int bIdx, List<org.openjudy.common.dto.TranscriptBlockDTO> allBlocks) {
        org.openjudy.common.dto.TranscriptBlockDTO blkMeta = allBlocks.stream()
                .filter(b -> b.blockIndex() == bIdx)
                .findFirst()
                .orElse(null);

        sb.append("--- BLOCO ").append(bIdx);
        if (blkMeta != null) {
            sb.append(": ").append(blkMeta.title())
              .append(" (").append(blkMeta.startTimeFormatted()).append(" - ").append(blkMeta.endTimeFormatted())
              .append(" | ~").append(Math.round(blkMeta.estimatedTokens() / 1000.0)).append("k tokens) ---\n");
            if (blkMeta.summary() != null && !blkMeta.summary().isBlank()) {
                sb.append("Síntese do Bloco: ").append(blkMeta.summary()).append("\n");
            }
        } else {
            sb.append(" ---\n");
        }

        List<TranscriptSegmentDTO> segments = getSegmentsByHearingId(hearingId, bIdx);
        for (TranscriptSegmentDTO s : segments) {
            sb.append("[").append(s.startTimeFormatted()).append(" - ").append(s.endTimeFormatted()).append("] ")
              .append(s.speakerRole()).append(" (").append(s.speakerName()).append("): ")
              .append(s.text()).append("\n");
        }
        sb.append("\n");
    }

    public TranscriptSegmentDTO updateSegment(String segmentIdStr, java.util.Map<String, Object> update) {
        UUID segmentId = null;
        try {
            segmentId = UUID.fromString(segmentIdStr);
        } catch (Exception ignored) {
        }

        if (segmentId != null && update != null) {
            try (Connection conn = dataSource.getConnection()) {
                if (update.containsKey("text") && update.get("text") != null) {
                    try (PreparedStatement ps = conn.prepareStatement("UPDATE tb_transcript_segments SET text = ? WHERE id = ?")) {
                        ps.setString(1, update.get("text").toString());
                        ps.setObject(2, segmentId);
                        ps.executeUpdate();
                    }
                }
                if (update.containsKey("speakerName") && update.get("speakerName") != null) {
                    try (PreparedStatement ps = conn.prepareStatement("UPDATE tb_transcript_segments SET speaker_name = ? WHERE id = ?")) {
                        ps.setString(1, update.get("speakerName").toString());
                        ps.setObject(2, segmentId);
                        ps.executeUpdate();
                    }
                }
                if (update.containsKey("speakerRole") && update.get("speakerRole") != null) {
                    try (PreparedStatement ps = conn.prepareStatement("UPDATE tb_transcript_segments SET speaker_role = ? WHERE id = ?")) {
                        ps.setString(1, update.get("speakerRole").toString());
                        ps.setObject(2, segmentId);
                        ps.executeUpdate();
                    }
                }
                if (update.containsKey("isKeyStatement") && update.get("isKeyStatement") != null) {
                    try (PreparedStatement ps = conn.prepareStatement("UPDATE tb_transcript_segments SET is_key_statement = ? WHERE id = ?")) {
                        ps.setBoolean(1, Boolean.parseBoolean(update.get("isKeyStatement").toString()));
                        ps.setObject(2, segmentId);
                        ps.executeUpdate();
                    }
                }
                if (update.containsKey("topicTag") && update.get("topicTag") != null) {
                    try (PreparedStatement ps = conn.prepareStatement("UPDATE tb_transcript_segments SET topic_tag = ? WHERE id = ?")) {
                        ps.setString(1, update.get("topicTag").toString());
                        ps.setObject(2, segmentId);
                        ps.executeUpdate();
                    }
                }

                try (PreparedStatement ps = conn.prepareStatement(
                        "SELECT id, segment_index, start_time_ms, end_time_ms, speaker_role, speaker_name, " +
                        "text, confidence_score, is_key_statement, topic_tag, block_index " +
                        "FROM tb_transcript_segments WHERE id = ?")) {
                    ps.setObject(1, segmentId);
                    try (ResultSet rs = ps.executeQuery()) {
                        if (rs.next()) {
                            long startMs = rs.getLong("start_time_ms");
                            long endMs = rs.getLong("end_time_ms");
                            int bIdx = rs.getInt("block_index");
                            return new TranscriptSegmentDTO(
                                    (UUID) rs.getObject("id"),
                                    rs.getInt("segment_index"),
                                    startMs,
                                    endMs,
                                    TranscriptSegmentDTO.formatMillis(startMs),
                                    TranscriptSegmentDTO.formatMillis(endMs),
                                    ParticipantRole.valueOf(rs.getString("speaker_role")),
                                    rs.getString("speaker_name"),
                                    rs.getString("text"),
                                    rs.getDouble("confidence_score"),
                                    rs.getBoolean("is_key_statement"),
                                    rs.getString("topic_tag"),
                                    bIdx > 0 ? bIdx : 1
                            );
                        }
                    }
                }
            } catch (Exception ignored) {
            }
        }

        ParticipantRole role = ParticipantRole.MAGISTRADO;
        if (update != null && update.get("speakerRole") != null) {
            try {
                role = ParticipantRole.valueOf(update.get("speakerRole").toString());
            } catch (Exception ignored) {}
        }
        return new TranscriptSegmentDTO(
                segmentId != null ? segmentId : UUID.randomUUID(),
                1,
                0L,
                18500L,
                "00:00",
                "00:18",
                role,
                update != null && update.get("speakerName") != null ? update.get("speakerName").toString() : "Participante",
                update != null && update.get("text") != null ? update.get("text").toString() : "",
                0.99,
                update != null && Boolean.TRUE.equals(update.get("isKeyStatement")),
                update != null && update.get("topicTag") != null ? update.get("topicTag").toString() : "Audiência",
                1
        );
    }
}
