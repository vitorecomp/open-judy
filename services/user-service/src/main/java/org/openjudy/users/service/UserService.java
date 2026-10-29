package org.openjudy.users.service;

import io.quarkus.panache.common.Page;
import io.quarkus.panache.common.Sort;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.BadRequestException;
import jakarta.ws.rs.NotFoundException;
import org.jboss.logging.Logger;
import org.openjudy.common.dto.UserDTO;
import org.openjudy.common.enums.UserRole;
import org.openjudy.common.enums.UserStatus;
import org.openjudy.common.events.UserCreatedEvent;
import org.openjudy.users.dto.ChangeStatusRequest;
import org.openjudy.users.dto.CreateUserRequest;
import org.openjudy.users.dto.UpdateUserRequest;
import org.openjudy.users.entity.UserActivityLogEntity;
import org.openjudy.users.entity.UserConfigurationEntity;
import org.openjudy.users.entity.UserEntity;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@ApplicationScoped
public class UserService {

    private static final Logger LOG = Logger.getLogger(UserService.class);

    @Inject
    UserConfigurationService configService;

    @Inject
    UserEventProducer eventProducer;

    public List<UserDTO> listUsers(int page, int size, UserRole role, UserStatus status, String search) {
        StringBuilder query = new StringBuilder("1 = 1");
        Map<String, Object> params = new HashMap<>();

        if (role != null) {
            query.append(" AND role = :role");
            params.put("role", role);
        }

        if (status != null) {
            query.append(" AND status = :status");
            params.put("status", status);
        }

        if (search != null && !search.isBlank()) {
            query.append(" AND (LOWER(fullName) LIKE :search OR LOWER(username) LIKE :search OR LOWER(email) LIKE :search)");
            params.put("search", "%" + search.toLowerCase().trim() + "%");
        }

        List<UserEntity> entities = UserEntity.find(query.toString(), Sort.by("fullName"), params)
                .page(Page.of(page, size))
                .list();

        return entities.stream().map(UserEntity::toDTO).collect(Collectors.toList());
    }

    public UserDTO getUserById(UUID id) {
        UserEntity user = UserEntity.findById(id);
        if (user == null) {
            throw new NotFoundException("Usuário não encontrado com ID: " + id);
        }
        return user.toDTO();
    }

    public UserDTO getUserByUsername(String username) {
        UserEntity user = UserEntity.findByUsername(username);
        if (user == null) {
            throw new NotFoundException("Usuário não encontrado com username: " + username);
        }
        return user.toDTO();
    }

    public UserDTO getUserByEmail(String email) {
        UserEntity user = UserEntity.findByEmail(email);
        if (user == null) {
            throw new NotFoundException("Usuário não encontrado com email: " + email);
        }
        return user.toDTO();
    }

    public UserDTO findUserByUsernameOrEmail(String identifier) {
        if (identifier == null || identifier.isBlank()) {
            return null;
        }
        String clean = identifier.trim().toLowerCase();
        UserEntity user = UserEntity.findByUsername(clean);
        if (user == null) {
            user = UserEntity.findByEmail(clean);
        }
        if (user == null) {
            user = UserEntity.findByKeycloakId(identifier.trim());
        }
        return user != null ? user.toDTO() : null;
    }

    public UserDTO findUserByKeycloakId(String keycloakId) {
        if (keycloakId == null || keycloakId.isBlank()) return null;
        UserEntity user = UserEntity.findByKeycloakId(keycloakId.trim());
        return user != null ? user.toDTO() : null;
    }

    /**
     * Just-In-Time (JIT) provisioning & identity synchronization for users authenticated via Keycloak OIDC.
     */
    @Transactional
    public UserDTO resolveUserFromKeycloak(
            String keycloakId,
            String username,
            String email,
            String fullName,
            UserRole role,
            String courtJurisdiction,
            String documentNumber
    ) {
        if ((email == null || email.isBlank()) && (username == null || username.isBlank()) && (keycloakId == null || keycloakId.isBlank())) {
            throw new BadRequestException("Credenciais Keycloak inválidas para resolução de usuário");
        }

        String cleanEmail = email != null ? email.trim().toLowerCase() : null;
        String cleanUsername = username != null ? username.trim().toLowerCase() : null;

        UserEntity user = null;

        // 1. Try finding by Keycloak ID
        if (keycloakId != null && !keycloakId.isBlank()) {
            user = UserEntity.findByKeycloakId(keycloakId.trim());
        }

        // 2. Try finding by email
        if (user == null && cleanEmail != null && !cleanEmail.isBlank()) {
            user = UserEntity.findByEmail(cleanEmail);
        }

        // 3. Try finding by username
        if (user == null && cleanUsername != null && !cleanUsername.isBlank()) {
            user = UserEntity.findByUsername(cleanUsername);
        }

        if (user != null) {
            // Existing user - update Keycloak ID and synchronization fields
            if (keycloakId != null && !keycloakId.isBlank()) {
                user.keycloakId = keycloakId.trim();
            }
            if (fullName != null && !fullName.isBlank() && (user.fullName == null || user.fullName.isBlank())) {
                user.fullName = fullName.trim();
            }
            if (role != null && user.role != role && role != UserRole.ASSESSOR) {
                user.role = role;
            }
            if (courtJurisdiction != null && !courtJurisdiction.isBlank() && (user.courtJurisdiction == null || user.courtJurisdiction.isBlank())) {
                user.courtJurisdiction = courtJurisdiction.trim();
            }
            if (documentNumber != null && !documentNumber.isBlank() && (user.documentNumber == null || user.documentNumber.isBlank())) {
                user.documentNumber = documentNumber.trim();
            }
            user.updatedAt = Instant.now();
            user.persist();
            logActivity(user, "KEYCLOAK_LOGIN", "Login realizado com sucesso via Keycloak IAM (OIDC)");
            return user.toDTO();
        }

        // 4. JIT Provision new user from Keycloak claims
        String resolvedUsername = cleanUsername;
        if (resolvedUsername == null || resolvedUsername.isBlank()) {
            resolvedUsername = cleanEmail != null && cleanEmail.contains("@")
                    ? cleanEmail.substring(0, cleanEmail.indexOf('@'))
                    : "user." + UUID.randomUUID().toString().substring(0, 6);
        }

        // Avoid username collision
        if (UserEntity.findByUsername(resolvedUsername) != null) {
            resolvedUsername = resolvedUsername + "." + UUID.randomUUID().toString().substring(0, 4);
        }

        String resolvedEmail = cleanEmail != null && !cleanEmail.isBlank()
                ? cleanEmail
                : resolvedUsername + "@openjudy.org";

        String resolvedName = fullName != null && !fullName.isBlank() ? fullName.trim() : resolvedUsername;
        UserRole resolvedRole = role != null ? role : determineRoleFromEmail(resolvedEmail);
        String resolvedJurisdiction = courtJurisdiction != null && !courtJurisdiction.isBlank()
                ? courtJurisdiction
                : "3ª Vara Cível Central da Comarca de São Paulo/SP";

        user = new UserEntity();
        user.username = resolvedUsername;
        user.email = resolvedEmail;
        user.keycloakId = keycloakId;
        user.fullName = resolvedName;
        user.role = resolvedRole;
        user.courtJurisdiction = resolvedJurisdiction;
        user.documentNumber = documentNumber;
        user.status = UserStatus.ACTIVE;
        user.avatarUrl = "https://ui-avatars.com/api/?name=" + resolvedName.replace(" ", "+") + "&background=4f46e5&color=fff";
        user.createdAt = Instant.now();
        user.updatedAt = Instant.now();
        user.persist();

        // Create default preferences
        configService.createDefaultConfig(user);

        logActivity(user, "KEYCLOAK_JIT_PROVISIONED", "Usuário provisionado automaticamente via Keycloak IAM com perfil: " + resolvedRole);

        // Emit RabbitMQ event
        eventProducer.emitUserCreated(new UserCreatedEvent(
                user.id,
                user.username,
                user.email,
                user.fullName,
                user.role,
                user.createdAt
        ));

        return user.toDTO();
    }

    /**
     * Backward compatibility method for legacy authentication calls.
     */
    @Transactional
    public UserDTO resolveUserFromIap(String email, String fullName, String subjectId) {
        return resolveUserFromKeycloak(subjectId, null, email, fullName, null, null, null);
    }

    private UserRole determineRoleFromEmail(String email) {
        String lower = email.toLowerCase();
        if (lower.contains("admin") || lower.startsWith("root@") || lower.startsWith("sysadmin@")) {
            return UserRole.ADMIN;
        }
        if (lower.contains("magistrad") || lower.contains("juiz") || lower.contains("juiza") || lower.contains("vara") || lower.contains("camila")) {
            return UserRole.MAGISTRADO;
        }
        if (lower.contains("advocacia") || lower.contains("advogado") || lower.contains("oab")) {
            return UserRole.ADVOGADO;
        }
        return UserRole.ASSESSOR;
    }

    @Transactional
    public UserDTO createUser(CreateUserRequest request) {
        if (UserEntity.findByUsername(request.username()) != null) {
            throw new BadRequestException("Já existe um usuário com o username informado: " + request.username());
        }

        if (UserEntity.findByEmail(request.email()) != null) {
            throw new BadRequestException("Já existe um usuário com o email informado: " + request.email());
        }

        UserEntity user = new UserEntity();
        user.username = request.username().trim().toLowerCase();
        user.email = request.email().trim().toLowerCase();
        user.fullName = request.fullName().trim();
        user.documentNumber = request.documentNumber();
        user.role = request.role() != null ? request.role() : UserRole.ASSESSOR;
        user.courtJurisdiction = request.courtJurisdiction();
        user.status = UserStatus.ACTIVE;
        user.avatarUrl = request.avatarUrl() != null ? request.avatarUrl() :
                "https://ui-avatars.com/api/?name=" + user.fullName.replace(" ", "+") + "&background=e63946&color=fff";
        user.createdAt = Instant.now();
        user.updatedAt = Instant.now();

        user.persist();

        // Initialize User Configuration
        if (request.initialConfiguration() != null) {
            configService.updateConfig(user.id, request.initialConfiguration());
        } else {
            configService.createDefaultConfig(user);
        }

        logActivity(user, "USER_CREATED", "Usuário criado com papel: " + user.role);

        // Emit RabbitMQ event
        eventProducer.emitUserCreated(new UserCreatedEvent(
                user.id,
                user.username,
                user.email,
                user.fullName,
                user.role,
                user.createdAt
        ));

        // Reload to get fresh relations
        user = UserEntity.findById(user.id);
        return user.toDTO();
    }

    @Transactional
    public UserDTO updateUser(UUID id, UpdateUserRequest request) {
        UserEntity user = UserEntity.findById(id);
        if (user == null) {
            throw new NotFoundException("Usuário não encontrado com ID: " + id);
        }

        if (request.fullName() != null && !request.fullName().isBlank()) {
            user.fullName = request.fullName().trim();
        }
        if (request.documentNumber() != null) {
            user.documentNumber = request.documentNumber();
        }
        if (request.role() != null) {
            user.role = request.role();
        }
        if (request.courtJurisdiction() != null) {
            user.courtJurisdiction = request.courtJurisdiction();
        }
        if (request.avatarUrl() != null) {
            user.avatarUrl = request.avatarUrl();
        }

        user.updatedAt = Instant.now();
        user.persist();

        logActivity(user, "USER_UPDATED", "Dados cadastrais do usuário atualizados");
        return user.toDTO();
    }

    @Transactional
    public UserDTO changeStatus(UUID id, ChangeStatusRequest request) {
        UserEntity user = UserEntity.findById(id);
        if (user == null) {
            throw new NotFoundException("Usuário não encontrado com ID: " + id);
        }

        UserStatus previous = user.status;
        user.status = request.status();
        user.updatedAt = Instant.now();
        user.persist();

        String desc = String.format("Status alterado de %s para %s. Motivo: %s",
                previous, user.status, request.reason() != null ? request.reason() : "Não informado");
        logActivity(user, "STATUS_CHANGED", desc);

        return user.toDTO();
    }

    @Transactional
    public void deleteUser(UUID id) {
        UserEntity user = UserEntity.findById(id);
        if (user == null) {
            throw new NotFoundException("Usuário não encontrado com ID: " + id);
        }

        user.status = UserStatus.INACTIVE;
        user.updatedAt = Instant.now();
        user.persist();

        logActivity(user, "USER_DEACTIVATED", "Conta de usuário desativada");
    }

    public List<UserActivityLogEntity> getUserActivityLogs(UUID userId) {
        UserEntity user = UserEntity.findById(userId);
        if (user == null) {
            throw new NotFoundException("Usuário não encontrado com ID: " + userId);
        }
        return UserActivityLogEntity.find("user.id = ?1 ORDER BY createdAt DESC", userId).list();
    }

    private void logActivity(UserEntity user, String action, String description) {
        try {
            UserActivityLogEntity log = new UserActivityLogEntity();
            log.user = user;
            log.action = action;
            log.description = description;
            log.createdAt = Instant.now();
            log.persist();
        } catch (Exception e) {
            LOG.warnf("Falha ao registrar log de atividade: %s", e.getMessage());
        }
    }
}
