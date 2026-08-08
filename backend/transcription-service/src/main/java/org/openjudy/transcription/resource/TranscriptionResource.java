package org.openjudy.transcription.resource;

import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;
import org.openjudy.common.dto.TranscriptSegmentDTO;
import org.openjudy.transcription.service.TranscriptionService;

import java.util.List;
import java.util.UUID;

@Path("/api/v1/transcriptions")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Tag(name = "Transcrição e Diarização (Transcription)", description = "Segmentos de áudio transcritos e identificação de falas")
public class TranscriptionResource {

    @Inject
    TranscriptionService transcriptionService;

    @GET
    @Path("/hearing/{hearingId}")
    @Operation(summary = "Obter transcrição completa segmentada por orador e carimbo de tempo")
    public Response getTranscriptByHearing(@PathParam("hearingId") UUID hearingId) {
        List<TranscriptSegmentDTO> segments = transcriptionService.getSegmentsByHearingId(hearingId);
        return Response.ok(segments).build();
    }
}
