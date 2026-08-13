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
    @Operation(summary = "Obter transcrição completa ou filtrada por bloco de vídeo/áudio (~256k tokens)")
    public Response getTranscriptByHearing(
            @PathParam("hearingId") UUID hearingId,
            @QueryParam("blockIndex") Integer blockIndex) {
        List<TranscriptSegmentDTO> segments = transcriptionService.getSegmentsByHearingId(hearingId, blockIndex);
        return Response.ok(segments).build();
    }

    @GET
    @Path("/hearing/{hearingId}/blocks")
    @Operation(summary = "Listar blocos multimodais particionados de ~256k tokens da audiência")
    public Response getBlocksByHearing(@PathParam("hearingId") UUID hearingId) {
        List<org.openjudy.common.dto.TranscriptBlockDTO> blocks = transcriptionService.getBlocksByHearingId(hearingId);
        return Response.ok(blocks).build();
    }

    @GET
    @Path("/hearing/{hearingId}/blocks/{blockIndex}/context")
    @Produces(MediaType.TEXT_PLAIN)
    @Operation(summary = "Obter texto concatenado e contexto estruturado de um bloco específico para injeção no Gemini Chat")
    public Response getBlockContext(
            @PathParam("hearingId") UUID hearingId,
            @PathParam("blockIndex") int blockIndex) {
        String context = transcriptionService.getBlockContextText(hearingId, blockIndex);
        return Response.ok(context).build();
    }

    @POST
    @Path("/hearing/{hearingId}/multi-context")
    @Produces(MediaType.TEXT_PLAIN)
    @Operation(summary = "Obter contexto consolidado de até 2 blocos selecionados ou transcrição particionada (> 512k tokens)")
    public Response getMultiBlockContext(
            @PathParam("hearingId") UUID hearingId,
            java.util.Map<String, Object> body) {
        
        List<Integer> blockIndices = new java.util.ArrayList<>();
        if (body != null && body.containsKey("blockIndices")) {
            Object obj = body.get("blockIndices");
            if (obj instanceof List<?> l) {
                for (Object item : l) {
                    if (item instanceof Number n) blockIndices.add(n.intValue());
                }
            }
        }
        boolean useFullTranscript = body != null && Boolean.TRUE.equals(body.get("useFullTranscript"));
        String context = transcriptionService.getMultiBlockContextText(hearingId, blockIndices, useFullTranscript);
        return Response.ok(context).build();
    }

    @POST
    @Path("/enqueue/{hearingId}")
    @Operation(summary = "Enfileirar job de transcrição no RabbitMQ para processamento pelo Pipeline Python")
    public Response enqueueHearingTranscription(
            @PathParam("hearingId") UUID hearingId,
            @QueryParam("caseNumber") @DefaultValue("0014238-19.2024.8.26.0100") String caseNumber,
            @QueryParam("mediaType") @DefaultValue("VIDEO") String mediaTypeStr,
            @QueryParam("filename") @DefaultValue("audiencia.mp4") String filename) {
        
        org.openjudy.common.enums.MediaType mediaType;
        try {
            mediaType = org.openjudy.common.enums.MediaType.valueOf(mediaTypeStr.toUpperCase());
        } catch (Exception e) {
            mediaType = org.openjudy.common.enums.MediaType.VIDEO;
        }

        transcriptionService.enqueueHearingTranscription(
                hearingId,
                caseNumber,
                "/media/hearings/" + filename,
                filename,
                mediaType == org.openjudy.common.enums.MediaType.VIDEO ? "video/mp4" : "audio/mpeg",
                mediaType
        );

        return Response.accepted(java.util.Map.of(
                "status", "ENQUEUED",
                "hearingId", hearingId,
                "queue", "judy.transcription.jobs",
                "message", "Job de transcrição encaminhado com sucesso para o RabbitMQ Pipeline"
        )).build();
    }
}
