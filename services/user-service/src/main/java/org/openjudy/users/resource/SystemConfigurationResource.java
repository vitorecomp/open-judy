package org.openjudy.users.resource;

import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;
import org.openjudy.common.dto.SystemConfigurationDTO;
import org.openjudy.users.entity.SystemConfigurationEntity;

@Path("/api/v1/system/config")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Tag(name = "System Configurations", description = "Gerenciamento de configurações globais e administrativas do ecossistema Open Judy")
public class SystemConfigurationResource {

    @GET
    @Operation(summary = "Obter configurações globais do sistema Open Judy")
    @Transactional
    public Response getSystemConfig() {
        SystemConfigurationEntity entity = SystemConfigurationEntity.getOrCreate();
        return Response.ok(entity.toDTO()).build();
    }

    @PUT
    @Operation(summary = "Atualizar configurações globais do sistema (Requer privilégios ADMIN)")
    @Transactional
    public Response updateSystemConfig(SystemConfigurationDTO dto) {
        SystemConfigurationEntity entity = SystemConfigurationEntity.getOrCreate();

        if (dto.systemName() != null && !dto.systemName().isBlank()) {
            entity.systemName = dto.systemName();
        }
        if (dto.logoUrl() != null) {
            entity.logoUrl = dto.logoUrl();
        }
        if (dto.geminiModel() != null && !dto.geminiModel().isBlank()) {
            entity.geminiModel = dto.geminiModel();
        }
        if (dto.geminiEmbeddingModel() != null && !dto.geminiEmbeddingModel().isBlank()) {
            entity.geminiEmbeddingModel = dto.geminiEmbeddingModel();
        }
        if (dto.maxAudioDurationMinutes() > 0) {
            entity.maxAudioDurationMinutes = dto.maxAudioDurationMinutes();
        }
        if (dto.vectorSimilarityThreshold() != null) {
            entity.vectorSimilarityThreshold = dto.vectorSimilarityThreshold();
        }
        entity.zeroTrustEnforced = dto.zeroTrustEnforced();
        if (dto.auditLogRetentionDays() > 0) {
            entity.auditLogRetentionDays = dto.auditLogRetentionDays();
        }
        entity.maintenanceMode = dto.maintenanceMode();
        if (dto.defaultLanguage() != null) {
            entity.defaultLanguage = dto.defaultLanguage();
        }
        if (dto.audioStorageBucket() != null) {
            entity.audioStorageBucket = dto.audioStorageBucket();
        }
        if (dto.systemProperties() != null) {
            entity.setSystemProperties(dto.systemProperties());
        }

        entity.persist();
        return Response.ok(entity.toDTO()).build();
    }
}
