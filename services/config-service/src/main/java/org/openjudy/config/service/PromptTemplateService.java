package org.openjudy.config.service;

import io.quarkus.hibernate.orm.panache.PanacheQuery;
import io.quarkus.panache.common.Page;
import io.quarkus.panache.common.Parameters;
import io.quarkus.panache.common.Sort;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.NotFoundException;
import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.Response;
import org.jboss.logging.Logger;
import org.openjudy.common.dto.PromptTemplateDTO;
import org.openjudy.common.enums.PromptCategory;
import org.openjudy.config.dto.CreatePromptRequest;
import org.openjudy.config.dto.RenderPromptRequest;
import org.openjudy.config.dto.RenderPromptResponse;
import org.openjudy.config.dto.UpdatePromptRequest;
import org.openjudy.config.entity.PromptTemplateEntity;

import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@ApplicationScoped
public class PromptTemplateService {

    private static final Logger LOG = Logger.getLogger(PromptTemplateService.class);
    private static final Pattern VAR_PATTERN = Pattern.compile("\\{\\{([^}]+)\\}\\}");

    @Inject
    ConfigEventProducer eventProducer;

    public List<PromptTemplateDTO> listPrompts(int page, int size, PromptCategory category, Boolean active, String search) {
        StringBuilder queryBuilder = new StringBuilder("1=1");
        Parameters params = new Parameters();

        if (category != null) {
            queryBuilder.append(" and category = :category");
            params.and("category", category);
        }

        if (active != null) {
            queryBuilder.append(" and active = :active");
            params.and("active", active);
        }

        if (search != null && !search.isBlank()) {
            queryBuilder.append(" and (lower(name) like :search or lower(code) like :search or lower(description) like :search)");
            params.and("search", "%" + search.trim().toLowerCase() + "%");
        }

        PanacheQuery<PromptTemplateEntity> query = PromptTemplateEntity.find(
                queryBuilder.toString(),
                Sort.by("category").and("name"),
                params
        );

        if (size > 0) {
            query.page(Page.of(Math.max(0, page), size));
        }

        return query.list().stream()
                .map(PromptTemplateEntity::toDTO)
                .collect(Collectors.toList());
    }

    public PromptTemplateDTO getPromptById(UUID id) {
        PromptTemplateEntity entity = PromptTemplateEntity.findById(id);
        if (entity == null) {
            throw new NotFoundException("Template de prompt não encontrado para o ID: " + id);
        }
        return entity.toDTO();
    }

    public PromptTemplateDTO getPromptByCode(String code) {
        PromptTemplateEntity entity = PromptTemplateEntity.find("code", code).firstResult();
        if (entity == null) {
            throw new NotFoundException("Template de prompt não encontrado com o código: " + code);
        }
        return entity.toDTO();
    }

    @Transactional
    public PromptTemplateDTO createPrompt(CreatePromptRequest request) {
        long count = PromptTemplateEntity.count("code", request.code());
        if (count > 0) {
            throw new WebApplicationException("Já existe um template de prompt com o código: " + request.code(), Response.Status.CONFLICT);
        }

        PromptTemplateEntity entity = new PromptTemplateEntity();
        entity.code = request.code().trim().toUpperCase();
        entity.name = request.name().trim();
        entity.description = request.description();
        entity.category = request.category();
        entity.systemInstruction = request.systemInstruction();
        entity.userPromptTemplate = request.userPromptTemplate();
        entity.setVariables(request.variables() != null ? request.variables() : extractVariables(request.userPromptTemplate(), request.systemInstruction()));
        String fallbackModel = request.category() == PromptCategory.TRANSCRIPTION ? "gemini-3.8-flash" : "gemini-4-argon";
        entity.defaultModel = request.defaultModel() != null ? request.defaultModel() : fallbackModel;
        entity.defaultTemperature = request.defaultTemperature() != null ? request.defaultTemperature() : 0.2;
        entity.defaultMaxTokens = request.defaultMaxTokens() != null ? request.defaultMaxTokens() : 8192;
        entity.version = 1;
        entity.active = request.active() != null ? request.active() : true;

        entity.persist();
        eventProducer.emitConfigUpdated("PROMPT", entity.code, "CREATED");

        LOG.infof("Prompt template created: %s (%s)", entity.code, entity.id);
        return entity.toDTO();
    }

    @Transactional
    public PromptTemplateDTO updatePrompt(UUID id, UpdatePromptRequest request) {
        PromptTemplateEntity entity = PromptTemplateEntity.findById(id);
        if (entity == null) {
            throw new NotFoundException("Template de prompt não encontrado para o ID: " + id);
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
        if (request.systemInstruction() != null) {
            entity.systemInstruction = request.systemInstruction();
        }
        if (request.userPromptTemplate() != null && !request.userPromptTemplate().isBlank()) {
            entity.userPromptTemplate = request.userPromptTemplate();
        }
        if (request.variables() != null) {
            entity.setVariables(request.variables());
        }
        if (request.defaultModel() != null && !request.defaultModel().isBlank()) {
            entity.defaultModel = request.defaultModel();
        }
        if (request.defaultTemperature() != null) {
            entity.defaultTemperature = request.defaultTemperature();
        }
        if (request.defaultMaxTokens() != null) {
            entity.defaultMaxTokens = request.defaultMaxTokens();
        }
        if (request.active() != null) {
            entity.active = request.active();
        }

        entity.version += 1;
        entity.persist();
        eventProducer.emitConfigUpdated("PROMPT", entity.code, "UPDATED");

        LOG.infof("Prompt template updated: %s (v%d)", entity.code, entity.version);
        return entity.toDTO();
    }

    @Transactional
    public void deletePrompt(UUID id) {
        PromptTemplateEntity entity = PromptTemplateEntity.findById(id);
        if (entity == null) {
            throw new NotFoundException("Template de prompt não encontrado para o ID: " + id);
        }
        String code = entity.code;
        entity.delete();
        eventProducer.emitConfigUpdated("PROMPT", code, "DELETED");
        LOG.infof("Prompt template deleted: %s (%s)", code, id);
    }

    public RenderPromptResponse renderPrompt(RenderPromptRequest request) {
        PromptTemplateEntity entity = PromptTemplateEntity.find("code", request.promptCode()).firstResult();
        if (entity == null) {
            throw new NotFoundException("Template de prompt não encontrado com o código: " + request.promptCode());
        }

        Map<String, Object> vars = request.variables() != null ? request.variables() : Collections.emptyMap();
        List<String> requiredVars = entity.parseVariables();
        List<String> missing = new ArrayList<>();

        for (String req : requiredVars) {
            if (!vars.containsKey(req) || vars.get(req) == null || String.valueOf(vars.get(req)).isBlank()) {
                missing.add(req);
            }
        }

        String renderedSystem = interpolate(entity.systemInstruction, vars);
        String renderedUser = interpolate(entity.userPromptTemplate, vars);

        return new RenderPromptResponse(
                entity.code,
                entity.defaultModel,
                entity.defaultTemperature,
                entity.defaultMaxTokens,
                renderedSystem,
                renderedUser,
                missing
        );
    }

    private List<String> extractVariables(String... templates) {
        Set<String> vars = new LinkedHashSet<>();
        for (String t : templates) {
            if (t == null) continue;
            Matcher matcher = VAR_PATTERN.matcher(t);
            while (matcher.find()) {
                vars.add(matcher.group(1).trim());
            }
        }
        return new ArrayList<>(vars);
    }

    private String interpolate(String template, Map<String, Object> vars) {
        if (template == null) return null;
        String result = template;
        for (Map.Entry<String, Object> entry : vars.entrySet()) {
            String placeholder = "{{" + entry.getKey() + "}}";
            String val = entry.getValue() != null ? String.valueOf(entry.getValue()) : "";
            result = result.replace(placeholder, val);
        }
        return result;
    }
}
