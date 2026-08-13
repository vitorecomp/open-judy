package org.openjudy.config.resource;

import jakarta.inject.Inject;
import jakarta.validation.Valid;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;
import org.openjudy.common.dto.PromptTemplateDTO;
import org.openjudy.common.enums.PromptCategory;
import org.openjudy.config.dto.CreatePromptRequest;
import org.openjudy.config.dto.RenderPromptRequest;
import org.openjudy.config.dto.RenderPromptResponse;
import org.openjudy.config.dto.UpdatePromptRequest;
import org.openjudy.config.service.PromptTemplateService;

import java.net.URI;
import java.util.List;
import java.util.UUID;

@Path("/api/v1/config/prompts")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Tag(name = "Prompt Templates", description = "Gerenciamento e renderização de prompts e instruções do sistema de IA judicial")
public class PromptTemplateResource {

    @Inject
    PromptTemplateService promptService;

    @GET
    @Operation(summary = "Listar templates de prompt com filtros por categoria, status e busca textual")
    public Response listPrompts(
            @QueryParam("page") @DefaultValue("0") int page,
            @QueryParam("size") @DefaultValue("50") int size,
            @QueryParam("category") PromptCategory category,
            @QueryParam("active") Boolean active,
            @QueryParam("search") String search) {
        List<PromptTemplateDTO> prompts = promptService.listPrompts(page, size, category, active, search);
        return Response.ok(prompts).build();
    }

    @GET
    @Path("/{id}")
    @Operation(summary = "Obter template de prompt por ID")
    public Response getPromptById(@PathParam("id") UUID id) {
        return Response.ok(promptService.getPromptById(id)).build();
    }

    @GET
    @Path("/code/{code}")
    @Operation(summary = "Obter template de prompt por código único (ex: PROMPT_ATA_GENERATION)")
    public Response getPromptByCode(@PathParam("code") String code) {
        return Response.ok(promptService.getPromptByCode(code)).build();
    }

    @POST
    @Operation(summary = "Criar novo template de prompt")
    public Response createPrompt(@Valid CreatePromptRequest request) {
        PromptTemplateDTO created = promptService.createPrompt(request);
        return Response.created(URI.create("/api/v1/config/prompts/" + created.id())).entity(created).build();
    }

    @PUT
    @Path("/{id}")
    @Operation(summary = "Atualizar template de prompt existente")
    public Response updatePrompt(@PathParam("id") UUID id, @Valid UpdatePromptRequest request) {
        PromptTemplateDTO updated = promptService.updatePrompt(id, request);
        return Response.ok(updated).build();
    }

    @POST
    @Path("/render")
    @Operation(summary = "Renderizar preview de prompt interpolando variáveis dinâmicas (ex: audiência, oradores, teses)")
    public Response renderPrompt(@Valid RenderPromptRequest request) {
        RenderPromptResponse response = promptService.renderPrompt(request);
        return Response.ok(response).build();
    }

    @DELETE
    @Path("/{id}")
    @Operation(summary = "Excluir template de prompt")
    public Response deletePrompt(@PathParam("id") UUID id) {
        promptService.deletePrompt(id);
        return Response.noContent().build();
    }
}
