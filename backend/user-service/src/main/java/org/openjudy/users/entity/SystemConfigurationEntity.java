package org.openjudy.users.entity;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import org.openjudy.common.dto.SystemConfigurationDTO;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "tb_system_configurations")
public class SystemConfigurationEntity extends PanacheEntityBase {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    public UUID id;

    @Column(name = "gemini_model", nullable = false, length = 64)
    public String geminiModel = "gemini-2.0-flash";

    @Column(name = "gemini_embedding_model", nullable = false, length = 64)
    public String geminiEmbeddingModel = "text-embedding-004";

    @Column(name = "max_audio_duration_minutes", nullable = false)
    public int maxAudioDurationMinutes = 240;

    @Column(name = "vector_similarity_threshold", nullable = false)
    public Double vectorSimilarityThreshold = 0.75;

    @Column(name = "zero_trust_enforced", nullable = false)
    public boolean zeroTrustEnforced = true;

    @Column(name = "audit_log_retention_days", nullable = false)
    public int auditLogRetentionDays = 365;

    @Column(name = "maintenance_mode", nullable = false)
    public boolean maintenanceMode = false;

    @Column(name = "default_language", nullable = false, length = 16)
    public String defaultLanguage = "pt-BR";

    @Column(name = "audio_storage_bucket", nullable = false, length = 128)
    public String audioStorageBucket = "open-judy-audio-archive";

    @Column(name = "system_properties_json", columnDefinition = "TEXT")
    public String systemPropertiesJson = "{}";

    @Column(name = "updated_at", nullable = false)
    public Instant updatedAt;

    @PrePersist
    @PreUpdate
    void prePersist() {
        updatedAt = Instant.now();
    }

    public static SystemConfigurationEntity getOrCreate() {
        SystemConfigurationEntity config = find("order by updatedAt desc").firstResult();
        if (config == null) {
            config = new SystemConfigurationEntity();
            config.systemPropertiesJson = "{\"copilotMaxHistoryTurns\":20,\"enableMultimodalDiarization\":true,\"alloyDbVectorDimensions\":768}";
            config.persist();
        }
        return config;
    }

    public Map<String, Object> parseSystemProperties() {
        if (systemPropertiesJson == null || systemPropertiesJson.isBlank()) {
            return new HashMap<>();
        }
        try {
            return OBJECT_MAPPER.readValue(systemPropertiesJson, new TypeReference<Map<String, Object>>() {});
        } catch (Exception e) {
            return new HashMap<>();
        }
    }

    public void setSystemProperties(Map<String, Object> map) {
        if (map == null) {
            this.systemPropertiesJson = "{}";
            return;
        }
        try {
            this.systemPropertiesJson = OBJECT_MAPPER.writeValueAsString(map);
        } catch (Exception e) {
            this.systemPropertiesJson = "{}";
        }
    }

    public SystemConfigurationDTO toDTO() {
        return new SystemConfigurationDTO(
                id,
                geminiModel,
                geminiEmbeddingModel,
                maxAudioDurationMinutes,
                vectorSimilarityThreshold,
                zeroTrustEnforced,
                auditLogRetentionDays,
                maintenanceMode,
                defaultLanguage,
                audioStorageBucket,
                parseSystemProperties(),
                updatedAt
        );
    }
}
