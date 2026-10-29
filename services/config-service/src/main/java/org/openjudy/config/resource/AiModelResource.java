package org.openjudy.config.resource;

import jakarta.inject.Inject;
import jakarta.validation.Valid;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;
import org.openjudy.common.dto.AiModelDTO;
import org.openjudy.common.enums.AiModelProvider;
import org.openjudy.common.enums.AiModelType;
import org.openjudy.config.dto.CreateAiModelRequest;
import org.openjudy.config.dto.UpdateAiModelRequest;
import org.openjudy.config.service.AiModelService;

import java.net.URI;
import java.util.List;
import java.util.UUID;

@Path("/api/v1/config/models")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Tag(name = "AI Models", description = "Gerenciamento de modelos de IA, parâmetros de inferência e provedores (Google Gemini, Vertex AI, etc.)")
public class AiModelResource {

    @Inject
    AiModelService modelService;

    @GET
    @Operation(summary = "Listar modelos de IA configurados")
    public Response listModels(
            @QueryParam("provider") AiModelProvider provider,
            @QueryParam("type") AiModelType modelType,
            @QueryParam("active") Boolean active) {
        List<AiModelDTO> models = modelService.listModels(provider, modelType, active);
        return Response.ok(models).build();
    }

    @GET
    @Path("/{id}")
    @Operation(summary = "Obter modelo de IA por ID")
    public Response getModelById(@PathParam("id") UUID id) {
        return Response.ok(modelService.getModelById(id)).build();
    }

    @GET
    @Path("/code/{modelId}")
    @Operation(summary = "Obter modelo de IA por identificador (ex: gemini-4-argon, gemini-3.8-flash)")
    public Response getModelByModelId(@PathParam("modelId") String modelId) {
        return Response.ok(modelService.getModelByModelId(modelId)).build();
    }

    @GET
    @Path("/default/{modelType}")
    @Operation(summary = "Obter modelo padrão ativo para uma categoria de IA específica (ex: LLM_MULTIMODAL, EMBEDDING)")
    public Response getDefaultModel(@PathParam("modelType") AiModelType modelType) {
        return Response.ok(modelService.getDefaultModel(modelType)).build();
    }

    @POST
    @Operation(summary = "Cadastrar novo modelo de IA")
    public Response createModel(@Valid CreateAiModelRequest request) {
        AiModelDTO created = modelService.createModel(request);
        return Response.created(URI.create("/api/v1/config/models/" + created.id())).entity(created).build();
    }

    @PUT
    @Path("/{id}")
    @Operation(summary = "Atualizar configurações do modelo de IA")
    public Response updateModel(@PathParam("id") UUID id, @Valid UpdateAiModelRequest request) {
        AiModelDTO updated = modelService.updateModel(id, request);
        return Response.ok(updated).build();
    }

    @PATCH
    @Path("/{id}/set-default")
    @Operation(summary = "Definir modelo como padrão para o seu tipo de inferência")
    public Response setDefaultModel(@PathParam("id") UUID id) {
        AiModelDTO updated = modelService.setDefaultModel(id);
        return Response.ok(updated).build();
    }

    @DELETE
    @Path("/{id}")
    @Operation(summary = "Excluir modelo de IA")
    public Response deleteModel(@PathParam("id") UUID id) {
        modelService.deleteModel(id);
        return Response.noContent().build();
    }
}
