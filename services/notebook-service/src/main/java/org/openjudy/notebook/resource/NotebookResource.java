package org.openjudy.notebook.resource;

import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;
import org.openjudy.notebook.dto.*;
import org.openjudy.notebook.service.NotebookChatService;
import org.openjudy.notebook.service.NotebookService;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Path("/api/v1/notebooks")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Tag(name = "Cadernos Judiciais e Chat Aberto (Notebook Service)", description = "Gerenciamento de cadernos de pesquisa, seleção de fontes de contexto multimodal e chat Gemini")
public class NotebookResource {

    @Inject
    NotebookService notebookService;

    @Inject
    NotebookChatService notebookChatService;

    @GET
    @Operation(summary = "Listar cadernos de pesquisa e análise do usuário")
    public Response listNotebooks(@QueryParam("userId") UUID userId) {
        List<NotebookDTO> list = notebookService.listNotebooks(userId);
        return Response.ok(list).build();
    }

    @POST
    @Operation(summary = "Criar um novo caderno de pesquisa judicial")
    public Response createNotebook(CreateNotebookRequest request) {
        NotebookDTO dto = notebookService.createNotebook(request);
        return Response.status(Response.Status.CREATED).entity(dto).build();
    }

    @GET
    @Path("/{id}")
    @Operation(summary = "Obter detalhes do caderno com suas fontes de contexto, notas e mensagens")
    public Response getNotebook(@PathParam("id") UUID id) {
        NotebookDTO dto = notebookService.getNotebook(id);
        if (dto == null) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }
        return Response.ok(dto).build();
    }

    @DELETE
    @Path("/{id}")
    @Operation(summary = "Excluir um caderno de pesquisa")
    public Response deleteNotebook(@PathParam("id") UUID id) {
        boolean success = notebookService.deleteNotebook(id);
        if (success) {
            return Response.noContent().build();
        }
        return Response.status(Response.Status.NOT_FOUND).build();
    }

    @POST
    @Path("/{id}/sources")
    @Operation(summary = "Adicionar uma nova fonte de contexto ao caderno (Bloco de Vídeo, Transcrição, Petição, Jurisprudência)")
    public Response addSource(@PathParam("id") UUID id, AddSourceRequest request) {
        NotebookSourceDTO source = notebookService.addSource(id, request);
        return Response.status(Response.Status.CREATED).entity(source).build();
    }

    @PUT
    @Path("/{id}/sources/{sourceId}/toggle")
    @Operation(summary = "Ativar ou desativar uma fonte específica para o contexto ativo do chat")
    public Response toggleSource(
            @PathParam("id") UUID id,
            @PathParam("sourceId") UUID sourceId,
            Map<String, Boolean> body) {
        boolean active = body != null && Boolean.TRUE.equals(body.get("active"));
        boolean success = notebookService.toggleSourceActive(id, sourceId, active);
        if (success) {
            return Response.ok(Map.of("sourceId", sourceId, "isActiveForChat", active)).build();
        }
        return Response.status(Response.Status.NOT_FOUND).build();
    }

    @DELETE
    @Path("/{id}/sources/{sourceId}")
    @Operation(summary = "Remover uma fonte de contexto do caderno")
    public Response deleteSource(@PathParam("id") UUID id, @PathParam("sourceId") UUID sourceId) {
        boolean success = notebookService.deleteSource(id, sourceId);
        if (success) {
            return Response.noContent().build();
        }
        return Response.status(Response.Status.NOT_FOUND).build();
    }

    @POST
    @Path("/{id}/chat")
    @Operation(summary = "Realizar pergunta no Chat Aberto do Caderno considerando estritamente as fontes ativas selecionadas")
    public Response chatWithNotebook(
            @PathParam("id") UUID id,
            NotebookChatRequest request) {
        NotebookChatResponse response = notebookChatService.processChat(id, request);
        return Response.ok(response).build();
    }

    @GET
    @Path("/{id}/chat/messages")
    @Operation(summary = "Histórico de mensagens do chat do caderno")
    public Response getChatMessages(@PathParam("id") UUID id) {
        List<NotebookChatMessageDTO> history = notebookChatService.getChatHistory(id);
        return Response.ok(history).build();
    }

    @POST
    @Path("/{id}/notes")
    @Operation(summary = "Salvar anotação ou minuta extraída das conclusões do chat")
    public Response createNote(
            @PathParam("id") UUID id,
            Map<String, String> body) {
        String title = body.getOrDefault("title", "Anotação Judicial");
        String content = body.getOrDefault("content", "");
        String noteType = body.getOrDefault("noteType", "NOTE");

        NotebookNoteDTO note = notebookService.createNote(id, title, content, noteType);
        return Response.status(Response.Status.CREATED).entity(note).build();
    }
}
