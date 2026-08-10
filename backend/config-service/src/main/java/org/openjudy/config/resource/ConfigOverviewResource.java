package org.openjudy.config.resource;

import jakarta.inject.Inject;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;
import org.openjudy.config.service.ConfigOverviewService;

@Path("/api/v1/config/overview")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Tag(name = "Configuration Overview", description = "Endpoint consolidado para obtenção de todas as configurações ativas do ecossistema Open Judy")
public class ConfigOverviewResource {

    @Inject
    ConfigOverviewService overviewService;

    @GET
    @Operation(summary = "Obter visão consolidada de prompts, modelos de IA, dashboards, tipos de notificação e parâmetros globais")
    public Response getOverview() {
        return Response.ok(overviewService.getOverview()).build();
    }
}
