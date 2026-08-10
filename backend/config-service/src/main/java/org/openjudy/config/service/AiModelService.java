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
import org.openjudy.common.dto.AiModelDTO;
import org.openjudy.common.enums.AiModelProvider;
import org.openjudy.common.enums.AiModelType;
import org.openjudy.config.dto.CreateAiModelRequest;
import org.openjudy.config.dto.UpdateAiModelRequest;
import org.openjudy.config.entity.AiModelEntity;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@ApplicationScoped
public class AiModelService {

    private static final Logger LOG = Logger.getLogger(AiModelService.class);

    @Inject
    ConfigEventProducer eventProducer;

    public List<AiModelDTO> listModels(AiModelProvider provider, AiModelType modelType, Boolean active) {
        StringBuilder queryBuilder = new StringBuilder("1=1");
        Parameters params = new Parameters();

        if (provider != null) {
            queryBuilder.append(" and provider = :provider");
            params.and("provider", provider);
        }

        if (modelType != null) {
            queryBuilder.append(" and modelType = :modelType");
            params.and("modelType", modelType);
        }

        if (active != null) {
            queryBuilder.append(" and active = :active");
            params.and("active", active);
        }

        PanacheQuery<AiModelEntity> query = AiModelEntity.find(
                queryBuilder.toString(),
                Sort.by("isDefault").descending().and("provider").and("name"),
                params
        );

        return query.list().stream()
                .map(AiModelEntity::toDTO)
                .collect(Collectors.toList());
    }

    public AiModelDTO getModelById(UUID id) {
        AiModelEntity entity = AiModelEntity.findById(id);
        if (entity == null) {
            throw new NotFoundException("Modelo de IA não encontrado para o ID: " + id);
        }
        return entity.toDTO();
    }

    public AiModelDTO getModelByModelId(String modelId) {
        AiModelEntity entity = AiModelEntity.find("modelId", modelId).firstResult();
        if (entity == null) {
            throw new NotFoundException("Modelo de IA não encontrado com o identificador: " + modelId);
        }
        return entity.toDTO();
    }

    public AiModelDTO getDefaultModel(AiModelType modelType) {
        AiModelEntity entity = AiModelEntity.find("modelType = ?1 and isDefault = true and active = true", modelType).firstResult();
        if (entity == null) {
            entity = AiModelEntity.find("modelType = ?1 and active = true", modelType).firstResult();
        }
        if (entity == null) {
            throw new NotFoundException("Nenhum modelo de IA padrão ativo encontrado para o tipo: " + modelType);
        }
        return entity.toDTO();
    }

    @Transactional
    public AiModelDTO createModel(CreateAiModelRequest request) {
        long count = AiModelEntity.count("modelId", request.modelId());
        if (count > 0) {
            throw new WebApplicationException("Já existe um modelo cadastrado com o identificador: " + request.modelId(), Response.Status.CONFLICT);
        }

        if (Boolean.TRUE.equals(request.isDefault())) {
            // Reset previous default for the same model type
            AiModelEntity.update("isDefault = false where modelType = ?1", request.modelType());
        }

        AiModelEntity entity = new AiModelEntity();
        entity.modelId = request.modelId().trim();
        entity.name = request.name().trim();
        entity.provider = request.provider();
        entity.modelType = request.modelType();
        entity.description = request.description();
        entity.contextWindowTokens = request.contextWindowTokens() != null ? request.contextWindowTokens() : 1048576;
        entity.maxOutputTokens = request.maxOutputTokens() != null ? request.maxOutputTokens() : 8192;
        entity.supportsMultimodal = request.supportsMultimodal() != null ? request.supportsMultimodal() : true;
        entity.supportsAudio = request.supportsAudio() != null ? request.supportsAudio() : true;
        entity.supportsStreaming = request.supportsStreaming() != null ? request.supportsStreaming() : true;
        entity.supportsSystemInstruction = request.supportsSystemInstruction() != null ? request.supportsSystemInstruction() : true;
        entity.costPer1kInputTokens = request.costPer1kInputTokens() != null ? request.costPer1kInputTokens() : 0.0;
        entity.costPer1kOutputTokens = request.costPer1kOutputTokens() != null ? request.costPer1kOutputTokens() : 0.0;
        entity.isDefault = Boolean.TRUE.equals(request.isDefault());
        entity.active = request.active() != null ? request.active() : true;
        entity.setParameters(request.parameters());

        entity.persist();
        eventProducer.emitConfigUpdated("MODEL", entity.modelId, "CREATED");

        LOG.infof("AI model created: %s (%s)", entity.modelId, entity.id);
        return entity.toDTO();
    }

    @Transactional
    public AiModelDTO updateModel(UUID id, UpdateAiModelRequest request) {
        AiModelEntity entity = AiModelEntity.findById(id);
        if (entity == null) {
            throw new NotFoundException("Modelo de IA não encontrado para o ID: " + id);
        }

        if (request.name() != null && !request.name().isBlank()) {
            entity.name = request.name().trim();
        }
        if (request.provider() != null) {
            entity.provider = request.provider();
        }
        if (request.modelType() != null) {
            entity.modelType = request.modelType();
        }
        if (request.description() != null) {
            entity.description = request.description();
        }
        if (request.contextWindowTokens() != null) {
            entity.contextWindowTokens = request.contextWindowTokens();
        }
        if (request.maxOutputTokens() != null) {
            entity.maxOutputTokens = request.maxOutputTokens();
        }
        if (request.supportsMultimodal() != null) {
            entity.supportsMultimodal = request.supportsMultimodal();
        }
        if (request.supportsAudio() != null) {
            entity.supportsAudio = request.supportsAudio();
        }
        if (request.supportsStreaming() != null) {
            entity.supportsStreaming = request.supportsStreaming();
        }
        if (request.supportsSystemInstruction() != null) {
            entity.supportsSystemInstruction = request.supportsSystemInstruction();
        }
        if (request.costPer1kInputTokens() != null) {
            entity.costPer1kInputTokens = request.costPer1kInputTokens();
        }
        if (request.costPer1kOutputTokens() != null) {
            entity.costPer1kOutputTokens = request.costPer1kOutputTokens();
        }
        if (Boolean.TRUE.equals(request.isDefault())) {
            AiModelEntity.update("isDefault = false where modelType = ?1 and id != ?2", entity.modelType, entity.id);
            entity.isDefault = true;
        } else if (Boolean.FALSE.equals(request.isDefault())) {
            entity.isDefault = false;
        }
        if (request.active() != null) {
            entity.active = request.active();
        }
        if (request.parameters() != null) {
            entity.setParameters(request.parameters());
        }

        entity.persist();
        eventProducer.emitConfigUpdated("MODEL", entity.modelId, "UPDATED");

        LOG.infof("AI model updated: %s", entity.modelId);
        return entity.toDTO();
    }

    @Transactional
    public AiModelDTO setDefaultModel(UUID id) {
        AiModelEntity entity = AiModelEntity.findById(id);
        if (entity == null) {
            throw new NotFoundException("Modelo de IA não encontrado para o ID: " + id);
        }

        AiModelEntity.update("isDefault = false where modelType = ?1", entity.modelType);
        entity.isDefault = true;
        entity.active = true;
        entity.persist();

        eventProducer.emitConfigUpdated("MODEL", entity.modelId, "SET_DEFAULT");
        LOG.infof("AI model set as default for type %s: %s", entity.modelType, entity.modelId);
        return entity.toDTO();
    }

    @Transactional
    public void deleteModel(UUID id) {
        AiModelEntity entity = AiModelEntity.findById(id);
        if (entity == null) {
            throw new NotFoundException("Modelo de IA não encontrado para o ID: " + id);
        }
        String modelId = entity.modelId;
        entity.delete();
        eventProducer.emitConfigUpdated("MODEL", modelId, "DELETED");
        LOG.infof("AI model deleted: %s (%s)", modelId, id);
    }
}
