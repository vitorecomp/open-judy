package org.openjudy.users.entity;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import org.openjudy.common.dto.UserDTO;
import org.openjudy.common.enums.UserRole;
import org.openjudy.common.enums.UserStatus;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "tb_users")
public class UserEntity extends PanacheEntityBase {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    public UUID id;

    @Column(name = "keycloak_id", length = 128)
    public String keycloakId;

    @Column(name = "username", nullable = false, unique = true, length = 64)
    public String username;

    @Column(name = "email", nullable = false, unique = true, length = 255)
    public String email;

    @Column(name = "full_name", nullable = false, length = 255)
    public String fullName;

    @Column(name = "document_number", length = 64)
    public String documentNumber;

    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false, length = 64)
    public UserRole role;

    @Column(name = "court_jurisdiction", length = 255)
    public String courtJurisdiction;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 32)
    public UserStatus status = UserStatus.ACTIVE;

    @Column(name = "avatar_url", length = 512)
    public String avatarUrl;

    @OneToOne(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    public UserConfigurationEntity configuration;

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    public List<UserActivityLogEntity> activityLogs = new ArrayList<>();

    @Column(name = "created_at", nullable = false)
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

    public static UserEntity findByUsername(String username) {
        return find("username", username).firstResult();
    }

    public static UserEntity findByEmail(String email) {
        return find("email", email).firstResult();
    }

    public static UserEntity findByKeycloakId(String keycloakId) {
        if (keycloakId == null || keycloakId.isBlank()) return null;
        return find("keycloakId", keycloakId).firstResult();
    }

    public UserDTO toDTO() {
        return new UserDTO(
                id,
                keycloakId,
                username,
                email,
                fullName,
                documentNumber,
                role,
                courtJurisdiction,
                status,
                avatarUrl,
                configuration != null ? configuration.toDTO() : null,
                createdAt,
                updatedAt
        );
    }
}
