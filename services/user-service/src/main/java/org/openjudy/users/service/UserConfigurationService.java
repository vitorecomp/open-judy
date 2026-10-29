package org.openjudy.users.service;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.NotFoundException;
import org.jboss.logging.Logger;
import org.openjudy.common.dto.UserConfigurationDTO;
import org.openjudy.common.events.UserConfigUpdatedEvent;
import org.openjudy.users.dto.UpdateUserConfigRequest;
import org.openjudy.users.entity.UserActivityLogEntity;
import org.openjudy.users.entity.UserConfigurationEntity;
import org.openjudy.users.entity.UserEntity;

import java.time.Instant;
import java.util.UUID;

@ApplicationScoped
public class UserConfigurationService {

    private static final Logger LOG = Logger.getLogger(UserConfigurationService.class);

    @Inject
    UserEventProducer eventProducer;

    public UserConfigurationDTO getConfigByUserId(UUID userId) {
        UserConfigurationEntity config = UserConfigurationEntity.findByUserId(userId);
        if (config == null) {
            // If user exists, create default config lazily
            UserEntity user = UserEntity.findById(userId);
            if (user == null) {
                throw new NotFoundException("Usuário não encontrado com id: " + userId);
            }
            return createDefaultConfig(user).toDTO();
        }
        return config.toDTO();
    }

    @Transactional
    public UserConfigurationEntity createDefaultConfig(UserEntity user) {
        LOG.infof("Criando configuração padrão para o usuário: %s", user.username);
        UserConfigurationEntity config = new UserConfigurationEntity();
        config.user = user;
        config.theme = "DARK";
        config.language = "pt-BR";
        config.fontSize = "MEDIUM";
        config.highContrast = false;
        config.compactView = false;
        config.defaultLandingPage = "DASHBOARD";
        config.playbackRate = 1.0;
        config.autoPlayNextSegment = true;
        config.autoScrollTranscript = true;
        config.showWaveform = true;
        config.skipSilence = false;
        config.defaultSkipSeconds = 5;
        config.autoGenerateAtaDraft = true;
        config.autoDetectContradictions = true;
        config.defaultAtaTemplate = "PADRAO_CIVEL";
        config.aiTemperature = 0.2;
        config.enableCopilotSuggestions = true;
        config.citationStyle = "TIMESTAMPS_ONLY";
        config.emailNotifications = true;
        config.hearingCompletedAlert = true;
        config.contradictionDetectedAlert = true;
        config.ataReadyAlert = true;
        config.dailyDigest = false;
        config.updatedAt = Instant.now();

        config.persist();
        user.configuration = config;
        return config;
    }

    @Transactional
    public UserConfigurationDTO updateConfig(UUID userId, UpdateUserConfigRequest request) {
        UserConfigurationEntity config = UserConfigurationEntity.findByUserId(userId);
        if (config == null) {
            UserEntity user = UserEntity.findById(userId);
            if (user == null) {
                throw new NotFoundException("Usuário não encontrado com id: " + userId);
            }
            config = createDefaultConfig(user);
        }

        if (request.theme() != null) config.theme = request.theme();
        if (request.language() != null) config.language = request.language();
        if (request.fontSize() != null) config.fontSize = request.fontSize();
        if (request.highContrast() != null) config.highContrast = request.highContrast();
        if (request.compactView() != null) config.compactView = request.compactView();
        if (request.defaultLandingPage() != null) config.defaultLandingPage = request.defaultLandingPage();
        if (request.playbackRate() != null) config.playbackRate = request.playbackRate();
        if (request.autoPlayNextSegment() != null) config.autoPlayNextSegment = request.autoPlayNextSegment();
        if (request.autoScrollTranscript() != null) config.autoScrollTranscript = request.autoScrollTranscript();
        if (request.showWaveform() != null) config.showWaveform = request.showWaveform();
        if (request.skipSilence() != null) config.skipSilence = request.skipSilence();
        if (request.defaultSkipSeconds() != null) config.defaultSkipSeconds = request.defaultSkipSeconds();
        if (request.autoGenerateAtaDraft() != null) config.autoGenerateAtaDraft = request.autoGenerateAtaDraft();
        if (request.autoDetectContradictions() != null) config.autoDetectContradictions = request.autoDetectContradictions();
        if (request.defaultAtaTemplate() != null) config.defaultAtaTemplate = request.defaultAtaTemplate();
        if (request.aiTemperature() != null) config.aiTemperature = request.aiTemperature();
        if (request.enableCopilotSuggestions() != null) config.enableCopilotSuggestions = request.enableCopilotSuggestions();
        if (request.citationStyle() != null) config.citationStyle = request.citationStyle();
        if (request.emailNotifications() != null) config.emailNotifications = request.emailNotifications();
        if (request.hearingCompletedAlert() != null) config.hearingCompletedAlert = request.hearingCompletedAlert();
        if (request.contradictionDetectedAlert() != null) config.contradictionDetectedAlert = request.contradictionDetectedAlert();
        if (request.ataReadyAlert() != null) config.ataReadyAlert = request.ataReadyAlert();
        if (request.dailyDigest() != null) config.dailyDigest = request.dailyDigest();
        if (request.digitalCertificateSubject() != null) config.digitalCertificateSubject = request.digitalCertificateSubject();
        if (request.autoSignApprovedMinutes() != null) config.autoSignApprovedMinutes = request.autoSignApprovedMinutes();
        if (request.judgeSignatureTitle() != null) config.judgeSignatureTitle = request.judgeSignatureTitle();
        if (request.customPreferences() != null) config.setCustomPreferences(request.customPreferences());

        config.updatedAt = Instant.now();
        config.persist();

        // Log activity
        logActivity(config.user, "CONFIG_UPDATED", "Preferências e configurações do usuário atualizadas");

        // Emit RabbitMQ event
        eventProducer.emitConfigUpdated(new UserConfigUpdatedEvent(
                userId,
                config.theme,
                config.language,
                config.defaultAtaTemplate,
                Instant.now()
        ));

        return config.toDTO();
    }

    @Transactional
    public UserConfigurationDTO resetToDefaults(UUID userId) {
        UserEntity user = UserEntity.findById(userId);
        if (user == null) {
            throw new NotFoundException("Usuário não encontrado com id: " + userId);
        }

        UserConfigurationEntity config = UserConfigurationEntity.findByUserId(userId);
        if (config != null) {
            config.delete();
        }

        UserConfigurationEntity newDefault = createDefaultConfig(user);
        logActivity(user, "CONFIG_RESET", "Configurações redefinidas para os padrões do sistema");

        return newDefault.toDTO();
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
