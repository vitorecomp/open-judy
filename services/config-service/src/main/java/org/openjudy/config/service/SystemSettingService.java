package org.openjudy.config.service;

import io.quarkus.panache.common.Parameters;
import io.quarkus.panache.common.Sort;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.NotFoundException;
import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.Response;
import org.jboss.logging.Logger;
import org.openjudy.common.dto.SystemSettingDTO;
import org.openjudy.config.dto.UpdateSystemSettingRequest;
import org.openjudy.config.entity.SystemSettingEntity;

import java.util.List;
import java.util.stream.Collectors;

@ApplicationScoped
public class SystemSettingService {

    private static final Logger LOG = Logger.getLogger(SystemSettingService.class);

    @Inject
    ConfigEventProducer eventProducer;

    public List<SystemSettingDTO> listSettings(String category) {
        if (category != null && !category.isBlank()) {
            return SystemSettingEntity.find("category = :cat", Sort.by("key"), Parameters.with("cat", category.trim().toUpperCase()))
                    .list().stream()
                    .map(e -> ((SystemSettingEntity) e).toDTO())
                    .collect(Collectors.toList());
        }

        return SystemSettingEntity.findAll(Sort.by("category").and("key"))
                .list().stream()
                .map(e -> ((SystemSettingEntity) e).toDTO())
                .collect(Collectors.toList());
    }

    public SystemSettingDTO getSettingByKey(String key) {
        SystemSettingEntity entity = SystemSettingEntity.findByKey(key);
        if (entity == null) {
            throw new NotFoundException("Configuração do sistema não encontrada para a chave: " + key);
        }
        return entity.toDTO();
    }

    @Transactional
    public SystemSettingDTO updateSetting(String key, UpdateSystemSettingRequest request) {
        SystemSettingEntity entity = SystemSettingEntity.findByKey(key);
        if (entity == null) {
            throw new NotFoundException("Configuração do sistema não encontrada para a chave: " + key);
        }

        if (entity.isReadOnly) {
            throw new WebApplicationException("A configuração '" + key + "' é somente leitura e não pode ser modificada via API.", Response.Status.FORBIDDEN);
        }

        entity.value = request.value();
        if (request.description() != null) {
            entity.description = request.description();
        }
        entity.persist();

        eventProducer.emitConfigUpdated("SETTING", entity.key, "UPDATED");
        LOG.infof("System setting updated: %s", entity.key);
        return entity.toDTO();
    }

    public String getString(String key, String defaultValue) {
        SystemSettingEntity entity = SystemSettingEntity.findByKey(key);
        return entity != null ? entity.value : defaultValue;
    }

    public int getInt(String key, int defaultValue) {
        SystemSettingEntity entity = SystemSettingEntity.findByKey(key);
        if (entity == null) return defaultValue;
        try {
            return Integer.parseInt(entity.value.trim());
        } catch (Exception e) {
            return defaultValue;
        }
    }

    public double getDouble(String key, double defaultValue) {
        SystemSettingEntity entity = SystemSettingEntity.findByKey(key);
        if (entity == null) return defaultValue;
        try {
            return Double.parseDouble(entity.value.trim());
        } catch (Exception e) {
            return defaultValue;
        }
    }

    public boolean getBoolean(String key, boolean defaultValue) {
        SystemSettingEntity entity = SystemSettingEntity.findByKey(key);
        if (entity == null) return defaultValue;
        return Boolean.parseBoolean(entity.value.trim());
    }
}
