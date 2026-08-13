package org.openjudy.config.entity;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import org.openjudy.common.dto.AiModelDTO;
import org.openjudy.common.enums.AiModelProvider;
import org.openjudy.common.enums.AiModelType;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "tb_ai_models")
public class AiModelEntity extends PanacheEntityBase {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    public UUID id;

    @Column(name = "model_id", nullable = false, unique = true, length = 128)
    public String modelId;

    @Column(name = "name", nullable = false)
    public String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "provider", nullable = false, length = 64)
    public AiModelProvider provider;

    @Enumerated(EnumType.STRING)
    @Column(name = "model_type", nullable = false, length = 64)
    public AiModelType modelType;

    @Column(name = "description", length = 500)
    public String description;

    @Column(name = "context_window_tokens", nullable = false)
    public int contextWindowTokens = 1048576;

    @Column(name = "max_output_tokens", nullable = false)
    public int maxOutputTokens = 8192;

    @Column(name = "supports_multimodal", nullable = false)
    public boolean supportsMultimodal = true;

    @Column(name = "supports_audio", nullable = false)
    public boolean supportsAudio = true;

    @Column(name = "supports_streaming", nullable = false)
    public boolean supportsStreaming = true;

    @Column(name = "supports_system_instruction", nullable = false)
    public boolean supportsSystemInstruction = true;

    @Column(name = "cost_per_1k_input_tokens")
    public Double costPer1kInputTokens = 0.0;

    @Column(name = "cost_per_1k_output_tokens")
    public Double costPer1kOutputTokens = 0.0;

    @Column(name = "is_default", nullable = false)
    public boolean isDefault = false;

    @Column(name = "active", nullable = false)
    public boolean active = true;

    @Column(name = "parameters_json", columnDefinition = "TEXT")
    public String parametersJson = "{}";

    @Column(name = "created_at", nullable = false, updatable = false)
    public Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    public Instant updatedAt;

    @PrePersist
    void prePersist() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
        updatedAt = Instant.now();
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = Instant.now();
    }

    public Map<String, Object> parseParameters() {
        if (parametersJson == null || parametersJson.isBlank()) {
            return new HashMap<>();
        }
        try {
            return OBJECT_MAPPER.readValue(parametersJson, new TypeReference<Map<String, Object>>() {});
        } catch (Exception e) {
            return new HashMap<>();
        }
    }

    public void setParameters(Map<String, Object> params) {
        if (params == null) {
            this.parametersJson = "{}";
            return;
        }
        try {
            this.parametersJson = OBJECT_MAPPER.writeValueAsString(params);
        } catch (Exception e) {
            this.parametersJson = "{}";
        }
    }

    public AiModelDTO toDTO() {
        return new AiModelDTO(
                id,
                modelId,
                name,
                provider,
                modelType,
                description,
                contextWindowTokens,
                maxOutputTokens,
                supportsMultimodal,
                supportsAudio,
                supportsStreaming,
                supportsSystemInstruction,
                costPer1kInputTokens,
                costPer1kOutputTokens,
                isDefault,
                active,
                parseParameters(),
                createdAt,
                updatedAt
        );
    }
}
