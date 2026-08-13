package org.openjudy.notification.resource;

import io.smallrye.mutiny.Multi;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;
import org.jboss.resteasy.reactive.RestStreamElementType;
import org.openjudy.common.dto.NotificationDTO;
import org.openjudy.common.enums.UserRole;
import org.openjudy.notification.dto.CreateNotificationRequest;
import org.openjudy.notification.service.NotificationService;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Path("/api/v1/notifications")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Tag(name = "Central de Notificações Judiciais (Notifications)", description = "Notificações em tempo real, SSE, contadores de leitura e integração RabbitMQ")
public class NotificationResource {

    @Inject
    NotificationService notificationService;

    @GET
    @Operation(summary = "Listar notificações judiciais com filtros por lido/não-lido e perfil")
    public Response listNotifications(
            @QueryParam("userId") UUID userId,
            @QueryParam("role") String roleStr,
            @QueryParam("unreadOnly") @DefaultValue("false") boolean unreadOnly,
            @QueryParam("limit") @DefaultValue("30") int limit) {

        UserRole targetRole = null;
        if (roleStr != null && !roleStr.isBlank()) {
            try {
                targetRole = UserRole.valueOf(roleStr.toUpperCase());
            } catch (Exception ignored) {}
        }

        List<NotificationDTO> notifications = notificationService.listNotifications(userId, targetRole, unreadOnly, limit);
        return Response.ok(notifications).build();
    }

    @GET
    @Path("/unread-count")
    @Operation(summary = "Obter quantidade de notificações pendentes não lidas")
    public Response getUnreadCount(
            @QueryParam("userId") UUID userId,
            @QueryParam("role") String roleStr) {

        UserRole targetRole = null;
        if (roleStr != null && !roleStr.isBlank()) {
            try {
                targetRole = UserRole.valueOf(roleStr.toUpperCase());
            } catch (Exception ignored) {}
        }

        long count = notificationService.countUnread(userId, targetRole);
        return Response.ok(Map.of("unreadCount", count)).build();
    }

    @PUT
    @Path("/{id}/read")
    @Operation(summary = "Marcar notificação individual como lida")
    public Response markAsRead(@PathParam("id") UUID id) {
        boolean success = notificationService.markAsRead(id);
        if (success) {
            return Response.ok(Map.of("id", id, "status", "READ")).build();
        }
        return Response.status(Response.Status.NOT_FOUND).build();
    }

    @PUT
    @Path("/read-all")
    @Operation(summary = "Marcar todas as notificações como lidas")
    public Response markAllAsRead(@QueryParam("userId") UUID userId) {
        int count = notificationService.markAllAsRead(userId);
        return Response.ok(Map.of("updatedCount", count, "status", "ALL_READ")).build();
    }

    @POST
    @Operation(summary = "Emitir uma nova notificação judicial no sistema")
    public Response createNotification(CreateNotificationRequest request) {
        NotificationDTO dto = notificationService.createNotification(
                request.userId(),
                request.targetRole(),
                request.title(),
                request.message(),
                request.category(),
                request.priority(),
                request.actionUrl(),
                request.hearingId()
        );
        return Response.status(Response.Status.CREATED).entity(dto).build();
    }

    @GET
    @Path("/stream")
    @Produces(MediaType.SERVER_SENT_EVENTS)
    @RestStreamElementType(MediaType.APPLICATION_JSON)
    @Operation(summary = "Stream reativo SSE (Server-Sent Events) para recebimento de notificações em tempo real")
    public Multi<NotificationDTO> streamNotifications() {
        return notificationService.getNotificationStream();
    }
}
