package org.openjudy.transcription.resource;

import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.util.Map;
import java.util.UUID;

@Path("/api/v1/summaries")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class HearingSummariesAliasResource {

    @Inject
    HearingAiResource hearingAiResource;

    @GET
    @Path("/hearing/{hearingId}")
    public Response getHearingSummary(@PathParam("hearingId") UUID hearingId) {
        return hearingAiResource.getAnalysis(hearingId);
    }

    @GET
    @Path("/hearing/{hearingId}/contradictions")
    public Response getHearingContradictions(@PathParam("hearingId") UUID hearingId) {
        return hearingAiResource.getContradictions(hearingId);
    }

    @GET
    @Path("/hearing/{hearingId}/status")
    public Response getHearingAnalysisStatus(@PathParam("hearingId") UUID hearingId) {
        return hearingAiResource.getAnalysisTaskStatus(hearingId);
    }

    @POST
    @Path("/hearing/{hearingId}/analyze")
    public Response analyzeHearing(
            @PathParam("hearingId") UUID hearingId,
            @QueryParam("force") @DefaultValue("true") boolean force,
            @QueryParam("sync") @DefaultValue("false") boolean sync,
            Map<String, Object> body) {
        return hearingAiResource.triggerAnalysisTask(hearingId, force, sync, body);
    }
}
