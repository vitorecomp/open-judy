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
    @Operation(summary = "Listar blocos multimodais particionados de ~256k tokens da audiência com telemetria de duração")
    public Response getBlocksByHearing(@PathParam("hearingId") UUID hearingId) {
        List<java.util.Map<String, Object>> blocks = transcriptionService.getBlocksWithTelemetryByHearingId(hearingId);
        return Response.ok(blocks).build();
    }

    @GET
    @Path("/telemetry/summary")
    @Operation(summary = "Obter telemetria de duração das partes transcritas e média histórica para estimativa de término")
    public Response getTelemetrySummary() {
        return Response.ok(transcriptionService.getPipelineTelemetrySummary()).build();
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

    @PUT
    @Path("/segments/{segmentId}")
    @Operation(summary = "Atualizar segmento de transcrição (texto, orador, destaque ou tag)")
    public Response updateSegment(
            @PathParam("segmentId") String segmentId,
            java.util.Map<String, Object> body) {
        TranscriptSegmentDTO updated = transcriptionService.updateSegment(segmentId, body);
        return Response.ok(updated).build();
    }

    @POST
    @Path("/enqueue/{hearingId}")
    @Operation(summary = "Enfileirar job de transcrição no RabbitMQ para processamento pelo Pipeline Python")
    public Response enqueueHearingTranscription(
            @PathParam("hearingId") UUID hearingId,
            @QueryParam("caseNumber") @DefaultValue("0014238-19.2024.8.26.0100") String caseNumber,
            @QueryParam("mediaType") @DefaultValue("VIDEO") String mediaTypeStr,
            @QueryParam("filename") @DefaultValue("audiencia.mp4") String filename,
            @QueryParam("audioUri") String audioUri,
            @QueryParam("forceReprocess") @DefaultValue("false") boolean forceReprocess) {
        
        org.openjudy.common.enums.MediaType mediaType;
        try {
            mediaType = org.openjudy.common.enums.MediaType.valueOf(mediaTypeStr.toUpperCase());
        } catch (Exception e) {
            mediaType = org.openjudy.common.enums.MediaType.VIDEO;
        }

        String mediaPath = (audioUri != null && !audioUri.isBlank()) ? audioUri : "/media/hearings/" + filename;

        transcriptionService.enqueueHearingTranscription(
                hearingId,
                caseNumber,
                mediaPath,
                filename,
                mediaType == org.openjudy.common.enums.MediaType.VIDEO ? "video/mp4" : "audio/mpeg",
                mediaType,
                forceReprocess
        );

        return Response.accepted(java.util.Map.of(
                "status", "ENQUEUED",
                "hearingId", hearingId,
                "forceReprocess", forceReprocess,
                "queue", "judy.transcription.jobs",
                "message", "Job de transcrição encaminhado com sucesso para o RabbitMQ Pipeline"
        )).build();
    }

    @POST
    @Path("/process")
    @Operation(summary = "Iniciar ou reprocessar transcrição de audiência com a versão atual do prompt no RabbitMQ Pipeline")
    public Response processHearingTranscription(java.util.Map<String, Object> body) {
        if (body == null || body.get("hearingId") == null) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity(java.util.Map.of("error", "hearingId is required"))
                    .build();
        }
        UUID hearingId = UUID.fromString(body.get("hearingId").toString());
        String caseNumber = body.get("caseNumber") != null ? body.get("caseNumber").toString() : "0014238-19.2024.8.26.0100";
        String filename = body.get("mediaFilename") != null
                ? body.get("mediaFilename").toString()
                : (body.get("filename") != null ? body.get("filename").toString() : "audiencia.mp4");
        String mediaTypeStr = body.get("mediaType") != null ? body.get("mediaType").toString() : "VIDEO";
        boolean forceReprocess = body.get("forceReprocess") == null || Boolean.parseBoolean(body.get("forceReprocess").toString());

        org.openjudy.common.enums.MediaType mediaType;
        try {
            mediaType = org.openjudy.common.enums.MediaType.valueOf(mediaTypeStr.toUpperCase());
        } catch (Exception e) {
            mediaType = org.openjudy.common.enums.MediaType.VIDEO;
        }

        String mediaPath = body.get("mediaUrl") != null ? body.get("mediaUrl").toString() : "/media/hearings/" + filename;

        transcriptionService.enqueueHearingTranscription(
                hearingId,
                caseNumber,
                mediaPath,
                filename,
                mediaType == org.openjudy.common.enums.MediaType.VIDEO ? "video/mp4" : "audio/mpeg",
                mediaType,
                forceReprocess
        );

        return Response.accepted(java.util.Map.of(
                "status", "ENQUEUED",
                "hearingId", hearingId,
                "forceReprocess", forceReprocess,
                "queue", "judy.transcription.jobs",
                "message", "Reprocessamento da audiência enfileirado com sucesso com a versão mais recente do prompt"
        )).build();
    }

    @POST
    @Path("/hearing/{hearingId}/reprocess")
    @Operation(summary = "Reprocessar transcrição completa de uma audiência (ou retomar partes pendentes)")
    public Response reprocessHearingById(
            @PathParam("hearingId") UUID hearingId,
            @QueryParam("forceReprocess") @DefaultValue("true") boolean forceReprocess,
            @QueryParam("caseNumber") @DefaultValue("0014238-19.2024.8.26.0100") String caseNumber,
            @QueryParam("filename") @DefaultValue("audiencia.mp4") String filename,
            @QueryParam("mediaType") @DefaultValue("VIDEO") String mediaTypeStr,
            java.util.Map<String, Object> body) {
        if (body != null) {
            if (body.get("caseNumber") != null) caseNumber = body.get("caseNumber").toString();
            if (body.get("mediaFilename") != null) filename = body.get("mediaFilename").toString();
            else if (body.get("filename") != null) filename = body.get("filename").toString();
            if (body.get("mediaType") != null) mediaTypeStr = body.get("mediaType").toString();
            if (body.get("forceReprocess") != null) forceReprocess = Boolean.parseBoolean(body.get("forceReprocess").toString());
        }
        return enqueueHearingTranscription(hearingId, caseNumber, mediaTypeStr, filename, null, forceReprocess);
    }

    @POST
    @Path("/hearing/{hearingId}/blocks/{blockId}/reprocess")
    @Operation(summary = "Reprocessar uma parte/bloco específico da transcrição da audiência")
    public Response reprocessSingleBlock(
            @PathParam("hearingId") UUID hearingId,
            @PathParam("blockId") String blockId,
            @QueryParam("caseNumber") @DefaultValue("0014238-19.2024.8.26.0100") String caseNumber,
            @QueryParam("filename") @DefaultValue("audiencia.mp4") String filename,
            @QueryParam("mediaType") @DefaultValue("VIDEO") String mediaTypeStr,
            java.util.Map<String, Object> body) {
        if (body != null) {
            if (body.get("caseNumber") != null) caseNumber = body.get("caseNumber").toString();
            if (body.get("mediaFilename") != null) filename = body.get("mediaFilename").toString();
            else if (body.get("filename") != null) filename = body.get("filename").toString();
            if (body.get("mediaType") != null) mediaTypeStr = body.get("mediaType").toString();
        }
        int blockIndex = transcriptionService.resetSingleBlockForReprocessing(hearingId, blockId);
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
                mediaType,
                false
        );
        return Response.accepted(java.util.Map.of(
                "status", "ENQUEUED",
                "hearingId", hearingId,
                "blockId", blockId,
                "blockIndex", blockIndex,
                "forceReprocess", false,
                "queue", "judy.transcription.jobs",
                "message", "Bloco " + blockIndex + " marcado como QUEUED e enfileirado para reprocessamento"
        )).build();
    }

    @POST
    @Path("/hearing/{hearingId}/repair-timestamps")
    @Operation(summary = "Verificar e reparar timestamps colapsados ou duplicados nos segmentos da audiência")
    public Response repairHearingTimestamps(@PathParam("hearingId") UUID hearingId) {
        return Response.ok(transcriptionService.repairHearingTimestamps(hearingId)).build();
    }
}
