package org.openjudy.agentgarden.resource;

import io.smallrye.mutiny.Multi;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;
import org.openjudy.agentgarden.model.*;
import org.openjudy.agentgarden.service.AgentRegistryService;
import org.openjudy.agentgarden.service.StreamAssistService;

import java.util.List;
import java.util.Map;

@Path("/api/v1/agent-garden")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Tag(name = "Agent Garden", description = "Gemini Enterprise Agent Garden and StreamAssist Gateway")
public class AgentGardenResource {

    @Inject
    AgentRegistryService agentRegistryService;

    @Inject
    StreamAssistService streamAssistService;

    @GET
    @Path("/agents")
    @Operation(summary = "List all registered Gemini Enterprise user agents")
    public List<EnterpriseAgent> listAgents() {
        return agentRegistryService.listAgents();
    }

    @GET
    @Path("/agents/{id}")
    @Operation(summary = "Get details of a specific enterprise agent")
    public Response getAgent(@PathParam("id") String id) {
        return agentRegistryService.getAgent(id)
                .map(Response::ok)
                .orElse(Response.status(Response.Status.NOT_FOUND))
                .build();
    }

    @POST
    @Path("/agents")
    @Operation(summary = "Register or import a new Gemini Enterprise user agent")
    public Response registerAgent(EnterpriseAgent agent) {
        EnterpriseAgent saved = agentRegistryService.registerAgent(agent);
        return Response.status(Response.Status.CREATED).entity(saved).build();
    }

    @DELETE
    @Path("/agents/{id}")
    @Operation(summary = "Remove an enterprise agent")
    public Response deleteAgent(@PathParam("id") String id) {
        boolean deleted = agentRegistryService.deleteAgent(id);
        if (deleted) return Response.noContent().build();
        return Response.status(Response.Status.NOT_FOUND).build();
    }

    @GET
    @Path("/agents/{id}/sessions")
    @Operation(summary = "List all conversation sessions for a specific agent")
    public List<SessionInfo> getAgentSessions(@PathParam("id") String id) {
        return streamAssistService.listSessionsByAgent(id);
    }

    @GET
    @Path("/sessions")
    @Operation(summary = "List active multi-turn StreamAssist sessions")
    public List<SessionInfo> listSessions(@QueryParam("agentId") String agentId) {
        if (agentId != null && !agentId.isBlank()) {
            return streamAssistService.listSessionsByAgent(agentId);
        }
        return streamAssistService.listSessions();
    }

    @POST
    @Path("/sessions")
    @Operation(summary = "Create a new conversation session with Gemini Enterprise")
    public Response createSession(Map<String, String> body) {
        String agentId = body != null ? body.get("agentId") : null;
        String title = body != null ? body.get("title") : null;
        SessionInfo session = streamAssistService.createOrGetSession(null, agentId, title);
        return Response.status(Response.Status.CREATED).entity(session).build();
    }

    @POST
    @Path("/stream")
    @Produces(MediaType.SERVER_SENT_EVENTS)
    @Operation(summary = "Stream answers from Gemini Enterprise StreamAssist via SSE")
    public Multi<StreamAssistChunk> streamAssist(StreamAssistRequest request) {
        return streamAssistService.streamAssist(request);
    }

    @POST
    @Path("/chat")
    @Operation(summary = "Send a non-streaming query to an enterprise agent")
    public Response chat(StreamAssistRequest request) {
        Multi<StreamAssistChunk> stream = streamAssistService.streamAssist(request);
        List<StreamAssistChunk> chunks = stream.collect().asList().await().indefinitely();

        StringBuilder fullText = new StringBuilder();
        List<Citation> citations = List.of();
        List<String> plannerSteps = new java.util.ArrayList<>();

        for (StreamAssistChunk chunk : chunks) {
            if (chunk.getEventType() == StreamAssistChunk.EventType.GROUNDED_CHUNK && chunk.getText() != null) {
                fullText.append(chunk.getText());
            } else if (chunk.getEventType() == StreamAssistChunk.EventType.PLANNER_STEP && chunk.getPlannerStep() != null) {
                plannerSteps.add(chunk.getPlannerStep());
            } else if (chunk.getEventType() == StreamAssistChunk.EventType.CITATION && chunk.getCitations() != null) {
                citations = chunk.getCitations();
            }
        }

        return Response.ok(Map.of(
                "sessionId", request.getSessionId() != null ? request.getSessionId() : "sess-default",
                "answer", fullText.toString().trim(),
                "citations", citations,
                "plannerSteps", plannerSteps
        )).build();
    }

    @GET
    @Path("/info")
    @Operation(summary = "Get Agent Garden service metadata and streamAssist status")
    public Response getInfo() {
        return Response.ok(Map.of(
                "service", "agent-garden",
                "version", "1.0.0-SNAPSHOT",
                "streamAssistEndpoint", streamAssistService.buildStreamAssistUrl(),
                "registeredAgentsCount", agentRegistryService.listAgents().size(),
                "status", "ONLINE"
        )).build();
    }
}
