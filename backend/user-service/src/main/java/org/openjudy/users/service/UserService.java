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
        return user != null ? user.toDTO() : null;
    }

    /**
     * Just-In-Time (JIT) provisioning for users authenticated via Google Cloud IAP.
     */
    @Transactional
    public UserDTO resolveUserFromIap(String email, String fullName, String subjectId) {
        if (email == null || email.isBlank()) {
            throw new BadRequestException("Email IAP não pode ser nulo");
        }

        String cleanEmail = email.trim().toLowerCase();
        UserEntity user = UserEntity.findByEmail(cleanEmail);

        if (user != null) {
            // Existing user - update subject ID and last login timestamp
            if (subjectId != null && !subjectId.isBlank()) {
                user.keycloakId = subjectId;
            }
            if (fullName != null && !fullName.isBlank() && (user.fullName == null || user.fullName.isBlank())) {
                user.fullName = fullName.trim();
            }
            user.updatedAt = Instant.now();
            user.persist();
            logActivity(user, "IAP_LOGIN", "Login realizado com sucesso via IAP");
            return user.toDTO();
        }

        // JIT Provision new user
        String username = cleanEmail.contains("@") ? cleanEmail.substring(0, cleanEmail.indexOf('@')) : cleanEmail;
        // Avoid conflict if username exists with different email
        if (UserEntity.findByUsername(username) != null) {
            username = username + "." + UUID.randomUUID().toString().substring(0, 4);
        }

        String name = fullName != null && !fullName.isBlank() ? fullName.trim() : username;
        UserRole inferredRole = determineRoleFromEmail(cleanEmail);

        user = new UserEntity();
        user.username = username;
        user.email = cleanEmail;
        user.keycloakId = subjectId;
        user.fullName = name;
        user.role = inferredRole;
        user.courtJurisdiction = "3ª Vara Cível Central da Comarca de São Paulo/SP";
        user.status = UserStatus.ACTIVE;
        user.avatarUrl = "https://ui-avatars.com/api/?name=" + name.replace(" ", "+") + "&background=4f46e5&color=fff";
        user.createdAt = Instant.now();
        user.updatedAt = Instant.now();
        user.persist();

        // Create default preferences
        configService.createDefaultConfig(user);

        logActivity(user, "IAP_JIT_PROVISIONED", "Usuário provisionado automaticamente via IAP com perfil: " + inferredRole);

        // Emit Kafka event
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

    private UserRole determineRoleFromEmail(String email) {
        String lower = email.toLowerCase();
        if (lower.contains("admin") || lower.startsWith("root@") || lower.startsWith("sysadmin@")) {
            return UserRole.ADMIN;
        }
        if (lower.contains("magistrad") || lower.contains("juiz") || lower.contains("juiza") || lower.contains("vara")) {
            return UserRole.MAGISTRADO;
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

        // Emit Kafka event
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
