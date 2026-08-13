package org.openjudy.config.entity;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import org.openjudy.common.dto.DashboardTypeDTO;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "tb_dashboard_types")
public class DashboardTypeEntity extends PanacheEntityBase {

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

    @Column(name = "target_role", nullable = false, length = 64)
    public String targetRole;

    @Column(name = "layout_type", nullable = false, length = 32)
    public String layoutType = "GRID";

    @Column(name = "widgets_json", columnDefinition = "TEXT")
    public String widgetsJson = "[]";

    @Column(name = "default_landing", nullable = false)
    public boolean defaultLanding = false;

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

    public List<Map<String, Object>> parseWidgets() {
        if (widgetsJson == null || widgetsJson.isBlank()) {
            return new ArrayList<>();
        }
        try {
            return OBJECT_MAPPER.readValue(widgetsJson, new TypeReference<List<Map<String, Object>>>() {});
        } catch (Exception e) {
            return new ArrayList<>();
        }
    }

    public void setWidgets(List<Map<String, Object>> widgets) {
        if (widgets == null) {
            this.widgetsJson = "[]";
            return;
        }
        try {
            this.widgetsJson = OBJECT_MAPPER.writeValueAsString(widgets);
        } catch (Exception e) {
            this.widgetsJson = "[]";
        }
    }

    public DashboardTypeDTO toDTO() {
        return new DashboardTypeDTO(
                id,
                code,
                name,
                description,
                targetRole,
                layoutType,
                parseWidgets(),
                defaultLanding,
                active,
                createdAt,
                updatedAt
        );
    }
}
