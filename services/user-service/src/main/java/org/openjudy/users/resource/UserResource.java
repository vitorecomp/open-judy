package org.openjudy.users.resource;

import jakarta.inject.Inject;
import jakarta.validation.Valid;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.core.SecurityContext;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;
import org.openjudy.common.dto.UserDTO;
import org.openjudy.common.enums.UserRole;
import org.openjudy.common.enums.UserStatus;
import org.openjudy.common.security.KeycloakPrincipal;
import org.openjudy.users.dto.ChangeStatusRequest;
import org.openjudy.users.dto.CreateUserRequest;
import org.openjudy.users.dto.UpdateUserRequest;
import org.openjudy.users.service.UserService;

import java.net.URI;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Path("/api/v1/users")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Tag(name = "Users", description = "Endpoints para gerenciamento de usuários, perfis e autenticação Keycloak OIDC")
public class UserResource {

    @Inject
    UserService userService;

    @GET
    @Operation(summary = "Listar usuários com filtros e paginação")
    public Response listUsers(
            @QueryParam("page") @DefaultValue("0") int page,
            @QueryParam("size") @DefaultValue("20") int size,
            @QueryParam("role") UserRole role,
            @QueryParam("status") UserStatus status,
            @QueryParam("search") String search) {
        List<UserDTO> users = userService.listUsers(page, size, role, status, search);
        return Response.ok(users).build();
    }

    @GET
    @Path("/roles")
    @Operation(summary = "Listar perfis do sistema (ADMIN, MAGISTRADO, ASSESSOR, ADVOGADO) e suas permissões")
    public Response listProfiles() {
        List<Map<String, Object>> roles = Arrays.stream(new UserRole[]{UserRole.ADMIN, UserRole.MAGISTRADO, UserRole.ASSESSOR, UserRole.ADVOGADO})
                .map(r -> Map.of(
                        "role", r.name(),
                        "title", r.getTitle(),
                        "description", r.getDescription(),
                        "permissions", r.getGrantedPermissions(),
                        "canSignMinutes", r.canSignMinutes(),
                        "canApproveAta", r.canApproveAta(),
                        "canDraftAta", r.canDraftAta(),
                        "canManageUsers", r.canManageUsers()
                ))
                .collect(Collectors.toList());
        return Response.ok(roles).build();
    }

    @GET
    @Path("/me")
    @Operation(summary = "Obter perfil do usuário logado via Keycloak OIDC / contexto de segurança")
    public Response getCurrentUser(@Context SecurityContext sec) {
        if (sec != null && sec.getUserPrincipal() instanceof KeycloakPrincipal principal) {
            if (principal.getUserId() != null) {
                try {
                    return Response.ok(userService.getUserById(principal.getUserId())).build();
                } catch (Exception ignored) {
                }
            }
            if (principal.getKeycloakId() != null && !principal.getKeycloakId().isBlank()) {
                UserDTO user = userService.findUserByKeycloakId(principal.getKeycloakId());
                if (user != null) {
                    return Response.ok(user).build();
                }
            }
            if (principal.getEmail() != null && !principal.getEmail().isBlank()) {
                UserDTO user = userService.findUserByUsernameOrEmail(principal.getEmail());
                if (user != null) {
                    return Response.ok(user).build();
                }
            }
            if (principal.getUsername() != null && !principal.getUsername().isBlank()) {
                UserDTO user = userService.findUserByUsernameOrEmail(principal.getUsername());
                if (user != null) {
                    return Response.ok(user).build();
                }
            }
        }

        // Fallback default mock user for Open Judy demo / session context
        UserDTO user = userService.findUserByUsernameOrEmail("camila.vasconcelos");
        if (user != null) {
            return Response.ok(user).build();
        }
        return Response.status(Response.Status.UNAUTHORIZED).build();
    }

    @GET
    @Path("/{id}")
    @Operation(summary = "Obter usuário por ID")
    public Response getUserById(@PathParam("id") UUID id) {
        UserDTO user = userService.getUserById(id);
        return Response.ok(user).build();
    }

    @GET
    @Path("/username/{username}")
    @Operation(summary = "Obter usuário por username")
    public Response getUserByUsername(@PathParam("username") String username) {
        UserDTO user = userService.getUserByUsername(username);
        return Response.ok(user).build();
    }

    @GET
    @Path("/email/{email}")
    @Operation(summary = "Obter usuário por email")
    public Response getUserByEmail(@PathParam("email") String email) {
        UserDTO user = userService.getUserByEmail(email);
        return Response.ok(user).build();
    }

    @POST
    @Operation(summary = "Criar novo usuário judicial")
    public Response createUser(@Valid CreateUserRequest request) {
        UserDTO created = userService.createUser(request);
        return Response.created(URI.create("/api/v1/users/" + created.id())).entity(created).build();
    }

    @PUT
    @Path("/{id}")
    @Operation(summary = "Atualizar dados cadastrais do usuário")
    public Response updateUser(@PathParam("id") UUID id, @Valid UpdateUserRequest request) {
        UserDTO updated = userService.updateUser(id, request);
        return Response.ok(updated).build();
    }

    @PATCH
    @Path("/{id}/status")
    @Operation(summary = "Alterar status do usuário (ACTIVE, INACTIVE, SUSPENDED)")
    public Response changeStatus(@PathParam("id") UUID id, @Valid ChangeStatusRequest request) {
        UserDTO updated = userService.changeStatus(id, request);
        return Response.ok(updated).build();
    }

    @DELETE
    @Path("/{id}")
    @Operation(summary = "Desativar conta de usuário")
    public Response deleteUser(@PathParam("id") UUID id) {
        userService.deleteUser(id);
        return Response.noContent().build();
    }

    @GET
    @Path("/{id}/activity")
    @Operation(summary = "Obter histórico de atividades do usuário")
    public Response getUserActivity(@PathParam("id") UUID id) {
        return Response.ok(userService.getUserActivityLogs(id)).build();
    }
}
