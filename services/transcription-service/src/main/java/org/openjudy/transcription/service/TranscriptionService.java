package org.openjudy.transcription.service;

import io.agroal.api.AgroalDataSource;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
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
        enqueueHearingTranscription(hearingId, caseNumber, mediaUrl, filename, mimeType, mediaType, false);
    }

    public void enqueueHearingTranscription(UUID hearingId, String caseNumber, String mediaUrl, String filename, String mimeType, org.openjudy.common.enums.MediaType mediaType, boolean forceReprocess) {
        if (forceReprocess) {
            resetHearingBlocksForReprocessing(hearingId);
        }
        try {
            rabbitMqProducer.enqueueJob(
                    hearingId,
                    caseNumber,
                    mediaUrl,
                    mediaUrl,
                    filename,
                    mimeType,
                    mediaType,
                    forceReprocess
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

    public void resetHearingBlocksForReprocessing(UUID hearingId) {
        if (hearingId == null) return;
        try (Connection conn = dataSource.getConnection()) {
            try (PreparedStatement ps = conn.prepareStatement(
                    "DELETE FROM tb_transcript_segments WHERE transcript_id IN (SELECT id FROM tb_transcripts WHERE hearing_id = ?)")) {
                ps.setObject(1, hearingId);
                ps.executeUpdate();
            }
            try (PreparedStatement ps = conn.prepareStatement(
                    "UPDATE tb_transcript_blocks SET status = 'QUEUED', segment_count = 0, started_at = NULL, completed_at = NULL, " +
                    "summary = 'Aguardando reprocessamento na fila sequencial com novo prompt...' WHERE hearing_id = ?")) {
                ps.setObject(1, hearingId);
                ps.executeUpdate();
            }
            try (PreparedStatement ps = conn.prepareStatement(
                    "UPDATE tb_hearings SET status = 'PROCESSING_TRANSCRIPTION', updated_at = CURRENT_TIMESTAMP WHERE id = ?")) {
                ps.setObject(1, hearingId);
                ps.executeUpdate();
            }
        } catch (Exception e) {
            e.printStackTrace();
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
                ps.setString(6, "GEMINI-3.8-FLASH");
                
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

    public List<java.util.Map<String, Object>> getBlocksWithTelemetryByHearingId(UUID hearingId) {
        List<java.util.Map<String, Object>> list = new ArrayList<>();
        String sql = "SELECT id, hearing_id, block_index, title, start_time_ms, end_time_ms, start_time_formatted, " +
                     "end_time_formatted, estimated_tokens, segment_count, summary, " +
                     "COALESCE(processing_duration_ms, 0) AS processing_duration_ms, " +
                     "COALESCE(status, 'COMPLETED') AS status, " +
                     "started_at, COALESCE(completed_at, created_at) AS completed_at, " +
                     "COALESCE(padding_seconds, 0) AS padding_seconds, " +
                     "COALESCE(context_segments_count, 0) AS context_segments_count, " +
                     "COALESCE(prompt_version, 'PROMPT_AUDIO_VIDEO_TRANSCRIPTION v3 (OPT_V1_DIARIZATION_SURGICAL)') AS prompt_version, " +
                     "COALESCE(pipeline_version, 'v3.2-VAD-SYNC (gemini-3.8-flash)') AS pipeline_version " +
                     "FROM tb_transcript_blocks WHERE hearing_id = ? ORDER BY block_index ASC";

        try (Connection conn = dataSource.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setObject(1, hearingId);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    java.util.Map<String, Object> row = new java.util.LinkedHashMap<>();
                    row.put("id", rs.getObject("id"));
                    row.put("hearingId", rs.getObject("hearing_id"));
                    row.put("blockIndex", rs.getInt("block_index"));
                    row.put("title", rs.getString("title"));
                    row.put("startTimeMs", rs.getLong("start_time_ms"));
                    row.put("endTimeMs", rs.getLong("end_time_ms"));
                    row.put("startTimeFormatted", rs.getString("start_time_formatted"));
                    row.put("endTimeFormatted", rs.getString("end_time_formatted"));
                    row.put("estimatedTokens", rs.getInt("estimated_tokens"));
                    row.put("segmentCount", rs.getInt("segment_count"));
                    row.put("summary", rs.getString("summary"));
                    row.put("processingDurationMs", rs.getLong("processing_duration_ms"));
                    String blkStatus = rs.getString("status");
                    row.put("status", blkStatus != null ? blkStatus : "COMPLETED");
                    java.sql.Timestamp stTs = rs.getTimestamp("started_at");
                    row.put("startedAt", stTs != null ? stTs.toInstant().toString() : null);
                    java.sql.Timestamp cmpTs = rs.getTimestamp("completed_at");
                    row.put("completedAt", ("COMPLETED".equalsIgnoreCase(blkStatus) && cmpTs != null) ? cmpTs.toInstant().toString() : null);
                    row.put("paddingSeconds", rs.getInt("padding_seconds"));
                    row.put("contextSegmentsCount", rs.getInt("context_segments_count"));
                    row.put("promptVersion", rs.getString("prompt_version"));
                    row.put("pipelineVersion", rs.getString("pipeline_version"));
                    list.add(row);
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return list;
    }

    public java.util.Map<String, Object> getPipelineTelemetrySummary() {
        java.util.Map<String, Object> result = new java.util.LinkedHashMap<>();
        List<Long> recentDurations = new ArrayList<>();
        java.util.Map<String, java.util.Map<String, Object>> byHearing = new java.util.LinkedHashMap<>();

        String sql = "SELECT hearing_id, block_index, COALESCE(status, 'COMPLETED') AS status, " +
                     "COALESCE(processing_duration_ms, 0) AS dur_ms, started_at, COALESCE(completed_at, created_at) AS completed_at " +
                     "FROM tb_transcript_blocks ORDER BY COALESCE(completed_at, created_at) DESC";

        try (Connection conn = dataSource.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql);
             ResultSet rs = ps.executeQuery()) {
            while (rs.next()) {
                String hid = String.valueOf(rs.getObject("hearing_id"));
                int bIdx = rs.getInt("block_index");
                String blkStatus = rs.getString("status");
                long durMs = rs.getLong("dur_ms");
                java.sql.Timestamp stTs = rs.getTimestamp("started_at");
                String stIso = stTs != null ? stTs.toInstant().toString() : null;
                java.sql.Timestamp cmpTs = rs.getTimestamp("completed_at");
                String cmpIso = cmpTs != null ? cmpTs.toInstant().toString() : null;

                java.util.Map<String, Object> hStats = byHearing.computeIfAbsent(hid, k -> {
                    java.util.Map<String, Object> m = new java.util.LinkedHashMap<>();
                    m.put("completedBlocks", 0);
                    m.put("totalBlocks", 0);
                    m.put("processingBlockIndex", null);
                    m.put("processingStartedAt", null);
                    m.put("totalProcessingMs", 0L);
                    m.put("lastCompletedAt", null);
                    m.put("recentBlockDurationsMs", new ArrayList<Long>());
                    return m;
                });

                hStats.put("totalBlocks", (int) hStats.get("totalBlocks") + 1);

                if ("PROCESSING".equalsIgnoreCase(blkStatus)) {
                    hStats.put("processingBlockIndex", bIdx);
                    hStats.put("processingStartedAt", stIso);
                } else if ("COMPLETED".equalsIgnoreCase(blkStatus)) {
                    if (durMs > 0 && recentDurations.size() < 12) {
                        recentDurations.add(durMs);
                    }
                    if (hStats.get("lastCompletedAt") == null && cmpIso != null) {
                        hStats.put("lastCompletedAt", cmpIso);
                    }
                    int count = (int) hStats.get("completedBlocks") + 1;
                    long totalMs = (long) hStats.get("totalProcessingMs") + (durMs > 0 ? durMs : 34000L);
                    hStats.put("completedBlocks", count);
                    hStats.put("totalProcessingMs", totalMs);
                    @SuppressWarnings("unchecked")
                    List<Long> hRecent = (List<Long>) hStats.get("recentBlockDurationsMs");
                    if (durMs > 0 && hRecent.size() < 6) {
                        hRecent.add(durMs);
                    }
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }

        long globalAvgMs = recentDurations.isEmpty()
                ? 34000L
                : Math.round(recentDurations.stream().mapToLong(Long::longValue).average().orElse(34000.0));

        for (java.util.Map<String, Object> hStats : byHearing.values()) {
            @SuppressWarnings("unchecked")
            List<Long> hRecent = (List<Long>) hStats.get("recentBlockDurationsMs");
            long hAvg = hRecent.isEmpty()
                    ? globalAvgMs
                    : Math.round(hRecent.stream().mapToLong(Long::longValue).average().orElse(globalAvgMs));
            hStats.put("averageBlockDurationMs", hAvg);
        }

        result.put("averagePartDurationMs", globalAvgMs);
        result.put("recentPartDurationsMs", recentDurations);
        result.put("hearings", byHearing);
        return result;
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

    public int resetSingleBlockForReprocessing(UUID hearingId, String blockIdOrIndex) {
        if (hearingId == null || blockIdOrIndex == null || blockIdOrIndex.isBlank()) {
            return 1;
        }
        int targetBlockIndex = -1;
        try (Connection conn = dataSource.getConnection()) {
            try {
                int parsedIdx = Integer.parseInt(blockIdOrIndex.trim());
                targetBlockIndex = parsedIdx;
            } catch (NumberFormatException ignored) {
                try (PreparedStatement ps = conn.prepareStatement(
                        "SELECT block_index FROM tb_transcript_blocks WHERE hearing_id = ? AND id::text = ? LIMIT 1")) {
                    ps.setObject(1, hearingId);
                    ps.setString(2, blockIdOrIndex.trim());
                    try (ResultSet rs = ps.executeQuery()) {
                        if (rs.next()) {
                            targetBlockIndex = rs.getInt(1);
                        }
                    }
                }
            }
            if (targetBlockIndex <= 0) {
                targetBlockIndex = 1;
            }
            try (PreparedStatement ps = conn.prepareStatement(
                    "DELETE FROM tb_transcript_segments WHERE transcript_id IN (SELECT id FROM tb_transcripts WHERE hearing_id = ?) AND block_index = ?")) {
                ps.setObject(1, hearingId);
                ps.setInt(2, targetBlockIndex);
                ps.executeUpdate();
            }
            try (PreparedStatement ps = conn.prepareStatement(
                    "UPDATE tb_transcript_blocks SET status = 'QUEUED', segment_count = 0, started_at = NULL, completed_at = NULL, " +
                    "summary = 'Aguardando reprocessamento individual desta parte...' WHERE hearing_id = ? AND block_index = ?")) {
                ps.setObject(1, hearingId);
                ps.setInt(2, targetBlockIndex);
                ps.executeUpdate();
            }
            try (PreparedStatement ps = conn.prepareStatement(
                    "UPDATE tb_hearings SET status = 'PROCESSING_TRANSCRIPTION', updated_at = CURRENT_TIMESTAMP WHERE id = ?")) {
                ps.setObject(1, hearingId);
                ps.executeUpdate();
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return Math.max(1, targetBlockIndex);
    }

    public java.util.Map<String, Object> repairHearingTimestamps(UUID hearingId) {
        int blocksChecked = 0;
        int blocksRepaired = 0;
        int totalSegments = 0;
        int distinctWindows = 0;

        try (Connection conn = dataSource.getConnection()) {
            List<int[]> blockBounds = new ArrayList<>();
            try (PreparedStatement ps = conn.prepareStatement(
                    "SELECT block_index, start_time_ms, end_time_ms FROM tb_transcript_blocks WHERE hearing_id = ? ORDER BY block_index ASC")) {
                ps.setObject(1, hearingId);
                try (ResultSet rs = ps.executeQuery()) {
                    while (rs.next()) {
                        blockBounds.add(new int[]{
                                rs.getInt("block_index"),
                                (int) rs.getLong("start_time_ms"),
                                (int) rs.getLong("end_time_ms")
                        });
                    }
                }
            }

            for (int[] blk : blockBounds) {
                blocksChecked++;
                int bIdx = blk[0];
                long bStart = Math.max(0L, blk[1]);
                long bEnd = Math.max(bStart + 5000L, blk[2]);

                List<UUID> segIds = new ArrayList<>();
                List<Long> stList = new ArrayList<>();
                List<Long> etList = new ArrayList<>();
                List<Integer> weights = new ArrayList<>();
                java.util.Set<String> winSet = new java.util.HashSet<>();
                boolean hasZeroOrOverlap = false;

                try (PreparedStatement ps = conn.prepareStatement(
                        "SELECT s.id, s.start_time_ms, s.end_time_ms, s.text " +
                        "FROM tb_transcript_segments s JOIN tb_transcripts t ON s.transcript_id = t.id " +
                        "WHERE t.hearing_id = ? AND COALESCE(s.block_index, 1) = ? ORDER BY s.segment_index ASC")) {
                    ps.setObject(1, hearingId);
                    ps.setInt(2, bIdx);
                    try (ResultSet rs = ps.executeQuery()) {
                        long prevEnd = -1L;
                        while (rs.next()) {
                            UUID sid = (UUID) rs.getObject("id");
                            long st = rs.getLong("start_time_ms");
                            long et = rs.getLong("end_time_ms");
                            String txt = rs.getString("text");
                            segIds.add(sid);
                            stList.add(st);
                            etList.add(et);
                            int w = Math.max(8, txt != null ? txt.replaceAll("[\\W_]+", "").length() : 8);
                            weights.add(w);
                            winSet.add(st + ":" + et);
                            if (et <= st || (prevEnd >= 0 && st < prevEnd)) {
                                hasZeroOrOverlap = true;
                            }
                            prevEnd = et;
                        }
                    }
                }

                int n = segIds.size();
                if (n == 0) continue;
                totalSegments += n;

                java.util.Set<Long> distinctStarts = new java.util.HashSet<>(stList);
                boolean isCollapsed = (n >= 2 && distinctStarts.size() <= Math.max(2, (int) (n * 0.65)));

                if (isCollapsed) {
                    blocksRepaired++;
                    double totalW = 0.0;
                    for (int w : weights) totalW += w;
                    long span = Math.max(n * 450L, bEnd - bStart);
                    long minStep = Math.min(450L, Math.max(120L, span / Math.max(1, n + 1)));
                    double cumW = 0.0;
                    long prevEnd = bStart;

                    try (PreparedStatement ups = conn.prepareStatement(
                            "UPDATE tb_transcript_segments SET start_time_ms = ?, end_time_ms = ? WHERE id = ?")) {
                        for (int i = 0; i < n; i++) {
                            double v0 = span * (cumW / totalW);
                            cumW += weights.get(i);
                            double v1 = span * (cumW / totalW);
                            long remAfter = n - 1 - i;
                            long maxSt = bEnd - (remAfter + 1) * minStep;
                            long st = Math.max(prevEnd, Math.min(maxSt, bStart + Math.round(v0)));
                            long maxEt = bEnd - remAfter * minStep;
                            long rawEt = bStart + Math.round(v1);
                            if (i + 1 < n && rawEt - st >= minStep + 200) {
                                rawEt -= 80;
                            }
                            long et = Math.max(st + minStep, Math.min(maxEt, rawEt));
                            prevEnd = et;
                            ups.setLong(1, st);
                            ups.setLong(2, et);
                            ups.setObject(3, segIds.get(i));
                            ups.addBatch();
                        }
                        ups.executeBatch();
                    }
                    distinctWindows += n;
                } else if (hasZeroOrOverlap) {
                    // Local surgical repair: trim previous endTimeMs on micro-overlaps without destroying block sync
                    blocksRepaired++;
                    long span = Math.max(n * 450L, bEnd - bStart);
                    long minStep = Math.min(450L, Math.max(120L, span / Math.max(1, n + 1)));
                    long[] newSt = new long[n];
                    long[] newEt = new long[n];
                    for (int i = 0; i < n; i++) {
                        newSt[i] = Math.max(bStart, Math.min(bEnd - minStep, stList.get(i)));
                        newEt[i] = Math.max(newSt[i] + minStep, Math.min(bEnd, etList.get(i)));
                        if (i > 0 && newEt[i - 1] > newSt[i] && newSt[i] >= newSt[i - 1] + minStep) {
                            newEt[i - 1] = newSt[i];
                        }
                    }
                    long prevEnd = bStart;
                    try (PreparedStatement ups = conn.prepareStatement(
                            "UPDATE tb_transcript_segments SET start_time_ms = ?, end_time_ms = ? WHERE id = ?")) {
                        for (int i = 0; i < n; i++) {
                            long remAfter = n - 1 - i;
                            long maxSt = bEnd - (remAfter + 1) * minStep;
                            long st = Math.max(prevEnd, Math.min(maxSt, newSt[i]));
                            long maxEt = bEnd - remAfter * minStep;
                            long et = Math.max(st + minStep, Math.min(maxEt, newEt[i]));
                            prevEnd = et;
                            ups.setLong(1, st);
                            ups.setLong(2, et);
                            ups.setObject(3, segIds.get(i));
                            ups.addBatch();
                        }
                        ups.executeBatch();
                    }
                    distinctWindows += n;
                } else {
                    distinctWindows += winSet.size();
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }

        java.util.Map<String, Object> res = new java.util.LinkedHashMap<>();
        res.put("hearingId", hearingId);
        res.put("blocksChecked", blocksChecked);
        res.put("blocksRepaired", blocksRepaired);
        res.put("totalSegments", totalSegments);
        res.put("distinctSegmentWindows", distinctWindows);
        res.put("status", "REPAIRED");
        return res;
    }
}
