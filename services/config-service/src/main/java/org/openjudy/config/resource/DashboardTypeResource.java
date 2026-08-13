package org.openjudy.config.resource;

import jakarta.inject.Inject;
import jakarta.validation.Valid;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;
import org.openjudy.common.dto.DashboardTypeDTO;
import org.openjudy.config.dto.CreateDashboardTypeRequest;
import org.openjudy.config.dto.UpdateDashboardTypeRequest;
import org.openjudy.config.service.DashboardTypeService;

import java.net.URI;
import java.util.List;
import java.util.UUID;

@Path("/api/v1/config/dashboards")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Tag(name = "Dashboard Types", description = "Definição de tipos de painéis, layouts e widgets por perfil judicial (Magistrado, Assessor, etc.)")
public class DashboardTypeResource {

    @Inject
    DashboardTypeService dashboardService;

    @GET
    @Operation(summary = "Listar tipos de painéis/dashboards")
    public Response listDashboards(
            @QueryParam("role") String role,
            @QueryParam("active") Boolean active) {
        List<DashboardTypeDTO> dashboards = dashboardService.listDashboards(role, active);
        return Response.ok(dashboards).build();
    }

    @GET
    @Path("/{id}")
    @Operation(summary = "Obter tipo de dashboard por ID")
    public Response getDashboardById(@PathParam("id") UUID id) {
        return Response.ok(dashboardService.getDashboardById(id)).build();
    }

    @GET
    @Path("/code/{code}")
    @Operation(summary = "Obter tipo de dashboard por código (ex: DASHBOARD_MAGISTRADO)")
    public Response getDashboardByCode(@PathParam("code") String code) {
        return Response.ok(dashboardService.getDashboardByCode(code)).build();
    }

    @GET
    @Path("/role/{role}")
    @Operation(summary = "Obter dashboards aplicáveis a um determinado perfil de usuário (ex: MAGISTRADO, ASSESSOR)")
    public Response getDashboardsByRole(@PathParam("role") String role) {
        return Response.ok(dashboardService.getDashboardsByRole(role)).build();
    }

    @POST
    @Operation(summary = "Cadastrar novo tipo de dashboard com layout e widgets")
    public Response createDashboard(@Valid CreateDashboardTypeRequest request) {
        DashboardTypeDTO created = dashboardService.createDashboard(request);
        return Response.created(URI.create("/api/v1/config/dashboards/" + created.id())).entity(created).build();
    }

    @PUT
    @Path("/{id}")
    @Operation(summary = "Atualizar layout e widgets de um dashboard")
    public Response updateDashboard(@PathParam("id") UUID id, @Valid UpdateDashboardTypeRequest request) {
        DashboardTypeDTO updated = dashboardService.updateDashboard(id, request);
        return Response.ok(updated).build();
    }

    @DELETE
    @Path("/{id}")
    @Operation(summary = "Excluir tipo de dashboard")
    public Response deleteDashboard(@PathParam("id") UUID id) {
        dashboardService.deleteDashboard(id);
        return Response.noContent().build();
    }
}
