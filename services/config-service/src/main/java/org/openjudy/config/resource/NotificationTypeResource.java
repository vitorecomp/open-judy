package org.openjudy.config.resource;

import jakarta.inject.Inject;
import jakarta.validation.Valid;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;
import org.openjudy.common.dto.NotificationTypeDTO;
import org.openjudy.common.enums.NotificationCategory;
import org.openjudy.common.enums.NotificationPriority;
import org.openjudy.config.dto.CreateNotificationTypeRequest;
import org.openjudy.config.dto.UpdateNotificationTypeRequest;
import org.openjudy.config.service.NotificationTypeService;

import java.net.URI;
import java.util.List;
import java.util.UUID;

@Path("/api/v1/config/notifications")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Tag(name = "Notification Types", description = "Definição de tipos de notificações, prioridades, canais (In-App, Email, WebSocket) e templates")
public class NotificationTypeResource {

    @Inject
    NotificationTypeService notificationService;

    @GET
    @Operation(summary = "Listar tipos de notificação do sistema")
    public Response listNotifications(
            @QueryParam("category") NotificationCategory category,
            @QueryParam("priority") NotificationPriority priority,
            @QueryParam("active") Boolean active) {
        List<NotificationTypeDTO> list = notificationService.listNotifications(category, priority, active);
        return Response.ok(list).build();
    }

    @GET
    @Path("/{id}")
    @Operation(summary = "Obter tipo de notificação por ID")
    public Response getNotificationById(@PathParam("id") UUID id) {
        return Response.ok(notificationService.getNotificationById(id)).build();
    }

    @GET
    @Path("/code/{code}")
    @Operation(summary = "Obter tipo de notificação por código único (ex: NOTIF_AUDIO_TRANSCRIPTION_COMPLETED)")
    public Response getNotificationByCode(@PathParam("code") String code) {
        return Response.ok(notificationService.getNotificationByCode(code)).build();
    }

    @POST
    @Operation(summary = "Cadastrar novo tipo de notificação")
    public Response createNotification(@Valid CreateNotificationTypeRequest request) {
        NotificationTypeDTO created = notificationService.createNotification(request);
        return Response.created(URI.create("/api/v1/config/notifications/" + created.id())).entity(created).build();
    }

    @PUT
    @Path("/{id}")
    @Operation(summary = "Atualizar template e configurações da notificação")
    public Response updateNotification(@PathParam("id") UUID id, @Valid UpdateNotificationTypeRequest request) {
        NotificationTypeDTO updated = notificationService.updateNotification(id, request);
        return Response.ok(updated).build();
    }

    @DELETE
    @Path("/{id}")
    @Operation(summary = "Excluir tipo de notificação")
    public Response deleteNotification(@PathParam("id") UUID id) {
        notificationService.deleteNotification(id);
        return Response.noContent().build();
    }
}
