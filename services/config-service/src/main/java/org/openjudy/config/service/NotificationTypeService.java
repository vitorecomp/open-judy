package org.openjudy.config.service;

import io.quarkus.hibernate.orm.panache.PanacheQuery;
import io.quarkus.panache.common.Parameters;
import io.quarkus.panache.common.Sort;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.NotFoundException;
import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.Response;
import org.jboss.logging.Logger;
import org.openjudy.common.dto.NotificationTypeDTO;
import org.openjudy.common.enums.NotificationCategory;
import org.openjudy.common.enums.NotificationChannel;
import org.openjudy.common.enums.NotificationPriority;
import org.openjudy.config.dto.CreateNotificationTypeRequest;
import org.openjudy.config.dto.UpdateNotificationTypeRequest;
import org.openjudy.config.entity.NotificationTypeEntity;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@ApplicationScoped
public class NotificationTypeService {

    private static final Logger LOG = Logger.getLogger(NotificationTypeService.class);

    @Inject
    ConfigEventProducer eventProducer;

    public List<NotificationTypeDTO> listNotifications(NotificationCategory category, NotificationPriority priority, Boolean active) {
        StringBuilder queryBuilder = new StringBuilder("1=1");
        Parameters params = new Parameters();

        if (category != null) {
            queryBuilder.append(" and category = :category");
            params.and("category", category);
        }

        if (priority != null) {
            queryBuilder.append(" and defaultPriority = :priority");
            params.and("priority", priority);
        }

        if (active != null) {
            queryBuilder.append(" and active = :active");
            params.and("active", active);
        }

        PanacheQuery<NotificationTypeEntity> query = NotificationTypeEntity.find(
                queryBuilder.toString(),
                Sort.by("category").and("name"),
                params
        );

        return query.list().stream()
                .map(NotificationTypeEntity::toDTO)
                .collect(Collectors.toList());
    }

    public NotificationTypeDTO getNotificationById(UUID id) {
        NotificationTypeEntity entity = NotificationTypeEntity.findById(id);
        if (entity == null) {
            throw new NotFoundException("Tipo de notificação não encontrado para o ID: " + id);
        }
        return entity.toDTO();
    }

    public NotificationTypeDTO getNotificationByCode(String code) {
        NotificationTypeEntity entity = NotificationTypeEntity.find("code", code).firstResult();
        if (entity == null) {
            throw new NotFoundException("Tipo de notificação não encontrado com o código: " + code);
        }
        return entity.toDTO();
    }

    @Transactional
    public NotificationTypeDTO createNotification(CreateNotificationTypeRequest request) {
        long count = NotificationTypeEntity.count("code", request.code());
        if (count > 0) {
            throw new WebApplicationException("Já existe uma notificação cadastrada com o código: " + request.code(), Response.Status.CONFLICT);
        }

        NotificationTypeEntity entity = new NotificationTypeEntity();
        entity.code = request.code().trim().toUpperCase();
        entity.name = request.name().trim();
        entity.description = request.description();
        entity.category = request.category();
        entity.defaultPriority = request.defaultPriority() != null ? request.defaultPriority() : NotificationPriority.NORMAL;
        entity.setSupportedChannels(request.supportedChannels() != null ? request.supportedChannels() : List.of(NotificationChannel.IN_APP, NotificationChannel.EMAIL));
        entity.templateTitle = request.templateTitle().trim();
        entity.templateBody = request.templateBody();
        entity.allowUserOverride = request.allowUserOverride() != null ? request.allowUserOverride() : true;
        entity.active = request.active() != null ? request.active() : true;

        entity.persist();
        eventProducer.emitConfigUpdated("NOTIFICATION", entity.code, "CREATED");

        LOG.infof("Notification type created: %s (%s)", entity.code, entity.id);
        return entity.toDTO();
    }

    @Transactional
    public NotificationTypeDTO updateNotification(UUID id, UpdateNotificationTypeRequest request) {
        NotificationTypeEntity entity = NotificationTypeEntity.findById(id);
        if (entity == null) {
            throw new NotFoundException("Tipo de notificação não encontrado para o ID: " + id);
        }

        if (request.name() != null && !request.name().isBlank()) {
            entity.name = request.name().trim();
        }
        if (request.description() != null) {
            entity.description = request.description();
        }
        if (request.category() != null) {
            entity.category = request.category();
        }
        if (request.defaultPriority() != null) {
            entity.defaultPriority = request.defaultPriority();
        }
        if (request.supportedChannels() != null) {
            entity.setSupportedChannels(request.supportedChannels());
        }
        if (request.templateTitle() != null && !request.templateTitle().isBlank()) {
            entity.templateTitle = request.templateTitle().trim();
        }
        if (request.templateBody() != null && !request.templateBody().isBlank()) {
            entity.templateBody = request.templateBody();
        }
        if (request.allowUserOverride() != null) {
            entity.allowUserOverride = request.allowUserOverride();
        }
        if (request.active() != null) {
            entity.active = request.active();
        }

        entity.persist();
        eventProducer.emitConfigUpdated("NOTIFICATION", entity.code, "UPDATED");

        LOG.infof("Notification type updated: %s", entity.code);
        return entity.toDTO();
    }

    @Transactional
    public void deleteNotification(UUID id) {
        NotificationTypeEntity entity = NotificationTypeEntity.findById(id);
        if (entity == null) {
            throw new NotFoundException("Tipo de notificação não encontrado para o ID: " + id);
        }
        String code = entity.code;
        entity.delete();
        eventProducer.emitConfigUpdated("NOTIFICATION", code, "DELETED");
        LOG.infof("Notification type deleted: %s (%s)", code, id);
    }
}
