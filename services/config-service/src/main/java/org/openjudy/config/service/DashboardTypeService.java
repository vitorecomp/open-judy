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
import org.openjudy.common.dto.DashboardTypeDTO;
import org.openjudy.config.dto.CreateDashboardTypeRequest;
import org.openjudy.config.dto.UpdateDashboardTypeRequest;
import org.openjudy.config.entity.DashboardTypeEntity;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@ApplicationScoped
public class DashboardTypeService {

    private static final Logger LOG = Logger.getLogger(DashboardTypeService.class);

    @Inject
    ConfigEventProducer eventProducer;

    public List<DashboardTypeDTO> listDashboards(String role, Boolean active) {
        StringBuilder queryBuilder = new StringBuilder("1=1");
        Parameters params = new Parameters();

        if (role != null && !role.isBlank()) {
            queryBuilder.append(" and (targetRole = :role or targetRole = 'ALL')");
            params.and("role", role.trim().toUpperCase());
        }

        if (active != null) {
            queryBuilder.append(" and active = :active");
            params.and("active", active);
        }

        PanacheQuery<DashboardTypeEntity> query = DashboardTypeEntity.find(
                queryBuilder.toString(),
                Sort.by("targetRole").and("name"),
                params
        );

        return query.list().stream()
                .map(DashboardTypeEntity::toDTO)
                .collect(Collectors.toList());
    }

    public DashboardTypeDTO getDashboardById(UUID id) {
        DashboardTypeEntity entity = DashboardTypeEntity.findById(id);
        if (entity == null) {
            throw new NotFoundException("Tipo de dashboard não encontrado para o ID: " + id);
        }
        return entity.toDTO();
    }

    public DashboardTypeDTO getDashboardByCode(String code) {
        DashboardTypeEntity entity = DashboardTypeEntity.find("code", code).firstResult();
        if (entity == null) {
            throw new NotFoundException("Tipo de dashboard não encontrado com o código: " + code);
        }
        return entity.toDTO();
    }

    public List<DashboardTypeDTO> getDashboardsByRole(String role) {
        return listDashboards(role, true);
    }

    @Transactional
    public DashboardTypeDTO createDashboard(CreateDashboardTypeRequest request) {
        long count = DashboardTypeEntity.count("code", request.code());
        if (count > 0) {
            throw new WebApplicationException("Já existe um tipo de dashboard cadastrado com o código: " + request.code(), Response.Status.CONFLICT);
        }

        DashboardTypeEntity entity = new DashboardTypeEntity();
        entity.code = request.code().trim().toUpperCase();
        entity.name = request.name().trim();
        entity.description = request.description();
        entity.targetRole = request.targetRole().trim().toUpperCase();
        entity.layoutType = request.layoutType() != null ? request.layoutType() : "GRID";
        entity.setWidgets(request.widgets());
        entity.defaultLanding = Boolean.TRUE.equals(request.defaultLanding());
        entity.active = request.active() != null ? request.active() : true;

        entity.persist();
        eventProducer.emitConfigUpdated("DASHBOARD", entity.code, "CREATED");

        LOG.infof("Dashboard type created: %s (%s)", entity.code, entity.id);
        return entity.toDTO();
    }

    @Transactional
    public DashboardTypeDTO updateDashboard(UUID id, UpdateDashboardTypeRequest request) {
        DashboardTypeEntity entity = DashboardTypeEntity.findById(id);
        if (entity == null) {
            throw new NotFoundException("Tipo de dashboard não encontrado para o ID: " + id);
        }

        if (request.name() != null && !request.name().isBlank()) {
            entity.name = request.name().trim();
        }
        if (request.description() != null) {
            entity.description = request.description();
        }
        if (request.targetRole() != null && !request.targetRole().isBlank()) {
            entity.targetRole = request.targetRole().trim().toUpperCase();
        }
        if (request.layoutType() != null && !request.layoutType().isBlank()) {
            entity.layoutType = request.layoutType();
        }
        if (request.widgets() != null) {
            entity.setWidgets(request.widgets());
        }
        if (request.defaultLanding() != null) {
            entity.defaultLanding = request.defaultLanding();
        }
        if (request.active() != null) {
            entity.active = request.active();
        }

        entity.persist();
        eventProducer.emitConfigUpdated("DASHBOARD", entity.code, "UPDATED");

        LOG.infof("Dashboard type updated: %s", entity.code);
        return entity.toDTO();
    }

    @Transactional
    public void deleteDashboard(UUID id) {
        DashboardTypeEntity entity = DashboardTypeEntity.findById(id);
        if (entity == null) {
            throw new NotFoundException("Tipo de dashboard não encontrado para o ID: " + id);
        }
        String code = entity.code;
        entity.delete();
        eventProducer.emitConfigUpdated("DASHBOARD", code, "DELETED");
        LOG.infof("Dashboard type deleted: %s (%s)", code, id);
    }
}
