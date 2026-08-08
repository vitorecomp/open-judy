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

@ApplicationScoped
public class TranscriptionService {

    @Inject
    GeminiAudioClient geminiAudioClient;

    @Inject
    AgroalDataSource dataSource;

    @Inject
    @Channel("transcription-completed")
    @Broadcast
    Emitter<TranscriptionCompletedEvent> completedEmitter;

    public void processAudioUploaded(AudioUploadedEvent event) {
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

            // 7. Publish TranscriptionCompletedEvent to Kafka
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

        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    public List<TranscriptSegmentDTO> getSegmentsByHearingId(UUID hearingId) {
        List<TranscriptSegmentDTO> list = new ArrayList<>();
        String sql = "SELECT s.id, s.segment_index, s.start_time_ms, s.end_time_ms, s.speaker_role, s.speaker_name, " +
                     "s.text, s.confidence_score, s.is_key_statement, s.topic_tag " +
                     "FROM tb_transcript_segments s " +
                     "JOIN tb_transcripts t ON s.transcript_id = t.id " +
                     "WHERE t.hearing_id = ? ORDER BY s.segment_index ASC";

        try (Connection conn = dataSource.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setObject(1, hearingId);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    long startMs = rs.getLong("start_time_ms");
                    long endMs = rs.getLong("end_time_ms");
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
                            rs.getString("topic_tag")
                    ));
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return list;
    }
}
