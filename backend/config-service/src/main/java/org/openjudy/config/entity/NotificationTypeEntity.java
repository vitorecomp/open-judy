package org.openjudy.config.entity;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import org.openjudy.common.dto.NotificationTypeDTO;
import org.openjudy.common.enums.NotificationCategory;
import org.openjudy.common.enums.NotificationChannel;
import org.openjudy.common.enums.NotificationPriority;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Entity
@Table(name = "tb_notification_types")
public class NotificationTypeEntity extends PanacheEntityBase {

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
    public NotificationCategory category;

    @Enumerated(EnumType.STRING)
    @Column(name = "default_priority", nullable = false, length = 32)
    public NotificationPriority defaultPriority = NotificationPriority.NORMAL;

    @Column(name = "supported_channels_json", columnDefinition = "TEXT")
    public String supportedChannelsJson = "[\"IN_APP\",\"EMAIL\"]";

    @Column(name = "template_title", nullable = false)
    public String templateTitle;

    @Column(name = "template_body", nullable = false, columnDefinition = "TEXT")
    public String templateBody;

    @Column(name = "allow_user_override", nullable = false)
    public boolean allowUserOverride = true;

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

    public List<NotificationChannel> parseSupportedChannels() {
        if (supportedChannelsJson == null || supportedChannelsJson.isBlank()) {
            return new ArrayList<>();
        }
        try {
            List<String> list = OBJECT_MAPPER.readValue(supportedChannelsJson, new TypeReference<List<String>>() {});
            return list.stream()
                    .map(NotificationChannel::valueOf)
                    .collect(Collectors.toList());
        } catch (Exception e) {
            return new ArrayList<>();
        }
    }

    public void setSupportedChannels(List<NotificationChannel> channels) {
        if (channels == null) {
            this.supportedChannelsJson = "[]";
            return;
        }
        try {
            List<String> stringList = channels.stream().map(Enum::name).collect(Collectors.toList());
            this.supportedChannelsJson = OBJECT_MAPPER.writeValueAsString(stringList);
        } catch (Exception e) {
            this.supportedChannelsJson = "[]";
        }
    }

    public NotificationTypeDTO toDTO() {
        return new NotificationTypeDTO(
                id,
                code,
                name,
                description,
                category,
                defaultPriority,
                parseSupportedChannels(),
                templateTitle,
                templateBody,
                allowUserOverride,
                active,
                createdAt,
                updatedAt
        );
    }
}
