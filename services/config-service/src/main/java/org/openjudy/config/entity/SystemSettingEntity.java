package org.openjudy.config.entity;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import org.openjudy.common.dto.SystemSettingDTO;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "tb_system_settings")
public class SystemSettingEntity extends PanacheEntityBase {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    public UUID id;

    @Column(name = "category", nullable = false, length = 64)
    public String category;

    @Column(name = "setting_key", nullable = false, unique = true, length = 128)
    public String key;

    @Column(name = "setting_value", nullable = false, columnDefinition = "TEXT")
    public String value;

    @Column(name = "value_type", nullable = false, length = 32)
    public String valueType = "STRING";

    @Column(name = "description", length = 500)
    public String description;

    @Column(name = "is_secret", nullable = false)
    public boolean isSecret = false;

    @Column(name = "is_read_only", nullable = false)
    public boolean isReadOnly = false;

    @Column(name = "updated_at", nullable = false)
    public Instant updatedAt;

    @PrePersist
    @PreUpdate
    void prePersist() {
        updatedAt = Instant.now();
    }

    public static SystemSettingEntity findByKey(String key) {
        return find("key", key).firstResult();
    }

    public SystemSettingDTO toDTO() {
        return new SystemSettingDTO(
                id,
                category,
                key,
                isSecret ? "********" : value,
                valueType,
                description,
                isSecret,
                isReadOnly,
                updatedAt
        );
    }
}
