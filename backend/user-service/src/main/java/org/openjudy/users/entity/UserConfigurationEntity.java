package org.openjudy.users.entity;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import org.openjudy.common.dto.UserConfigurationDTO;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "tb_user_configurations")
public class UserConfigurationEntity extends PanacheEntityBase {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    public UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    public UserEntity user;

    @Column(name = "theme", nullable = false, length = 32)
    public String theme = "DARK";

    @Column(name = "language", nullable = false, length = 16)
    public String language = "pt-BR";

    @Column(name = "font_size", nullable = false, length = 16)
    public String fontSize = "MEDIUM";

    @Column(name = "high_contrast", nullable = false)
    public boolean highContrast = false;

    @Column(name = "compact_view", nullable = false)
    public boolean compactView = false;

    @Column(name = "default_landing_page", nullable = false, length = 32)
    public String defaultLandingPage = "DASHBOARD";

    @Column(name = "playback_rate", nullable = false)
    public Double playbackRate = 1.0;

    @Column(name = "auto_play_next_segment", nullable = false)
    public boolean autoPlayNextSegment = true;

    @Column(name = "auto_scroll_transcript", nullable = false)
    public boolean autoScrollTranscript = true;

    @Column(name = "show_waveform", nullable = false)
    public boolean showWaveform = true;

    @Column(name = "skip_silence", nullable = false)
    public boolean skipSilence = false;

    @Column(name = "default_skip_seconds", nullable = false)
    public int defaultSkipSeconds = 5;

    @Column(name = "auto_generate_ata_draft", nullable = false)
    public boolean autoGenerateAtaDraft = true;

    @Column(name = "auto_detect_contradictions", nullable = false)
    public boolean autoDetectContradictions = true;

    @Column(name = "default_ata_template", nullable = false, length = 64)
    public String defaultAtaTemplate = "PADRAO_CIVEL";

    @Column(name = "ai_temperature", nullable = false)
    public Double aiTemperature = 0.2;

    @Column(name = "enable_copilot_suggestions", nullable = false)
    public boolean enableCopilotSuggestions = true;

    @Column(name = "citation_style", nullable = false, length = 32)
    public String citationStyle = "TIMESTAMPS_ONLY";

    @Column(name = "email_notifications", nullable = false)
    public boolean emailNotifications = true;

    @Column(name = "hearing_completed_alert", nullable = false)
    public boolean hearingCompletedAlert = true;

    @Column(name = "contradiction_detected_alert", nullable = false)
    public boolean contradictionDetectedAlert = true;

    @Column(name = "ata_ready_alert", nullable = false)
    public boolean ataReadyAlert = true;

    @Column(name = "daily_digest", nullable = false)
    public boolean dailyDigest = false;

    @Column(name = "digital_certificate_subject", length = 255)
    public String digitalCertificateSubject;

    @Column(name = "auto_sign_approved_minutes", nullable = false)
    public boolean autoSignApprovedMinutes = false;

    @Column(name = "judge_signature_title", length = 255)
    public String judgeSignatureTitle;

    @Column(name = "custom_preferences_json", columnDefinition = "TEXT")
    public String customPreferencesJson = "{}";

    @Column(name = "updated_at", nullable = false)
    public Instant updatedAt;

    @PrePersist
    @PreUpdate
    void prePersist() {
        updatedAt = Instant.now();
    }

    public static UserConfigurationEntity findByUserId(UUID userId) {
        return find("user.id", userId).firstResult();
    }

    public Map<String, Object> parseCustomPreferences() {
        if (customPreferencesJson == null || customPreferencesJson.isBlank()) {
            return new HashMap<>();
        }
        try {
            return OBJECT_MAPPER.readValue(customPreferencesJson, new TypeReference<Map<String, Object>>() {});
        } catch (Exception e) {
            return new HashMap<>();
        }
    }

    public void setCustomPreferences(Map<String, Object> map) {
        if (map == null) {
            this.customPreferencesJson = "{}";
            return;
        }
        try {
            this.customPreferencesJson = OBJECT_MAPPER.writeValueAsString(map);
        } catch (Exception e) {
            this.customPreferencesJson = "{}";
        }
    }

    public UserConfigurationDTO toDTO() {
        return new UserConfigurationDTO(
                id,
                user != null ? user.id : null,
                theme,
                language,
                fontSize,
                highContrast,
                compactView,
                defaultLandingPage,
                playbackRate,
                autoPlayNextSegment,
                autoScrollTranscript,
                showWaveform,
                skipSilence,
                defaultSkipSeconds,
                autoGenerateAtaDraft,
                autoDetectContradictions,
                defaultAtaTemplate,
                aiTemperature,
                enableCopilotSuggestions,
                citationStyle,
                emailNotifications,
                hearingCompletedAlert,
                contradictionDetectedAlert,
                ataReadyAlert,
                dailyDigest,
                digitalCertificateSubject,
                autoSignApprovedMinutes,
                judgeSignatureTitle,
                parseCustomPreferences(),
                updatedAt
        );
    }
}
