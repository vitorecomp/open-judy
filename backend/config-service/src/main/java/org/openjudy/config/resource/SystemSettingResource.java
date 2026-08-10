package org.openjudy.config.resource;

import jakarta.inject.Inject;
import jakarta.validation.Valid;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;
import org.openjudy.common.dto.SystemSettingDTO;
import org.openjudy.config.dto.UpdateSystemSettingRequest;
import org.openjudy.config.service.SystemSettingService;

import java.util.List;

@Path("/api/v1/config/settings")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Tag(name = "System Settings", description = "Parâmetros e propriedades chave-valor globais da plataforma Open Judy")
public class SystemSettingResource {

    @Inject
    SystemSettingService settingService;

    @GET
    @Operation(summary = "Listar todas as configurações globais ou filtrar por categoria (AI_CORE, SECURITY, STORAGE, etc.)")
    public Response listSettings(@QueryParam("category") String category) {
        List<SystemSettingDTO> list = settingService.listSettings(category);
        return Response.ok(list).build();
    }

    @GET
    @Path("/{key}")
    @Operation(summary = "Obter valor de uma configuração específica pela chave")
    public Response getSettingByKey(@PathParam("key") String key) {
        return Response.ok(settingService.getSettingByKey(key)).build();
    }

    @PUT
    @Path("/{key}")
    @Operation(summary = "Atualizar valor de uma configuração global do sistema")
    public Response updateSetting(@PathParam("key") String key, @Valid UpdateSystemSettingRequest request) {
        SystemSettingDTO updated = settingService.updateSetting(key, request);
        return Response.ok(updated).build();
    }
}
