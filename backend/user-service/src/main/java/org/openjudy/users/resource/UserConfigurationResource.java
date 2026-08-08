package org.openjudy.users.resource;

import jakarta.inject.Inject;
import jakarta.validation.Valid;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;
import org.openjudy.common.dto.UserConfigurationDTO;
import org.openjudy.common.dto.UserDTO;
import org.openjudy.users.dto.UpdateUserConfigRequest;
import org.openjudy.users.service.UserConfigurationService;
import org.openjudy.users.service.UserService;

import java.util.UUID;

@Path("/api/v1/users")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Tag(name = "User Configurations", description = "Gerenciamento de configurações e preferências de interface, IA, áudio e notificações")
public class UserConfigurationResource {

    @Inject
    UserConfigurationService configService;

    @Inject
    UserService userService;

    @GET
    @Path("/{userId}/config")
    @Operation(summary = "Obter configurações e preferências do usuário")
    public Response getUserConfig(@PathParam("userId") UUID userId) {
        UserConfigurationDTO config = configService.getConfigByUserId(userId);
        return Response.ok(config).build();
    }

    @PUT
    @Path("/{userId}/config")
    @Operation(summary = "Atualizar configurações e preferências do usuário")
    public Response updateUserConfig(@PathParam("userId") UUID userId, @Valid UpdateUserConfigRequest request) {
        UserConfigurationDTO updated = configService.updateConfig(userId, request);
        return Response.ok(updated).build();
    }

    @POST
    @Path("/{userId}/config/reset")
    @Operation(summary = "Restaurar preferências padrão do usuário")
    public Response resetUserConfig(@PathParam("userId") UUID userId) {
        UserConfigurationDTO reset = configService.resetToDefaults(userId);
        return Response.ok(reset).build();
    }

    @GET
    @Path("/me/config")
    @Operation(summary = "Obter preferências do usuário logado (padrão Dra. Camila Vasconcelos)")
    public Response getCurrentUserConfig() {
        UserDTO me = userService.getUserByUsername("camila.vasconcelos");
        UserConfigurationDTO config = configService.getConfigByUserId(me.id());
        return Response.ok(config).build();
    }

    @PUT
    @Path("/me/config")
    @Operation(summary = "Atualizar preferências do usuário logado")
    public Response updateCurrentUserConfig(@Valid UpdateUserConfigRequest request) {
        UserDTO me = userService.getUserByUsername("camila.vasconcelos");
        UserConfigurationDTO updated = configService.updateConfig(me.id(), request);
        return Response.ok(updated).build();
    }
}
