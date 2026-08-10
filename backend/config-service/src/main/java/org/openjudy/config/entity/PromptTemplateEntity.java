package org.openjudy.config.entity;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import org.openjudy.common.dto.PromptTemplateDTO;
import org.openjudy.common.enums.PromptCategory;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "tb_prompt_templates")
public class PromptTemplateEntity extends PanacheEntityBase {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    public UUID id;

    @Column(name = "code", nullable = false, unique = true, length = 64)
    public String code;

    @Column(name = "name", nullable = false)
    public String name;

    @Column(name = "description", length = 500)
    public String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "category", nullable = false, length = 64)
    public PromptCategory category;

    @Column(name = "system_instruction", columnDefinition = "TEXT")
    public String systemInstruction;

    @Column(name = "user_prompt_template", nullable = false, columnDefinition = "TEXT")
    public String userPromptTemplate;

    @Column(name = "variables_json", columnDefinition = "TEXT")
    public String variablesJson = "[]";

    @Column(name = "default_model", length = 64)
    public String defaultModel = "gemini-2.0-flash";

    @Column(name = "default_temperature")
    public Double defaultTemperature = 0.2;

    @Column(name = "default_max_tokens")
    public Integer defaultMaxTokens = 8192;

    @Column(name = "version", nullable = false)
    public int version = 1;

    @Column(name = "active", nullable = false)
    public boolean active = true;

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

    public List<String> parseVariables() {
        if (variablesJson == null || variablesJson.isBlank()) {
            return new ArrayList<>();
        }
        try {
            return OBJECT_MAPPER.readValue(variablesJson, new TypeReference<List<String>>() {});
        } catch (Exception e) {
            return new ArrayList<>();
        }
    }

    public void setVariables(List<String> variables) {
        if (variables == null) {
            this.variablesJson = "[]";
            return;
        }
        try {
            this.variablesJson = OBJECT_MAPPER.writeValueAsString(variables);
        } catch (Exception e) {
            this.variablesJson = "[]";
        }
    }

    public PromptTemplateDTO toDTO() {
        return new PromptTemplateDTO(
                id,
                code,
                name,
                description,
                category,
                systemInstruction,
                userPromptTemplate,
                parseVariables(),
                defaultModel,
                defaultTemperature,
                defaultMaxTokens,
                version,
                active,
                createdAt,
                updatedAt
        );
    }
}
