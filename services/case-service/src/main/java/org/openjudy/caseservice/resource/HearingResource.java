package org.openjudy.caseservice.resource;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;
import org.openjudy.common.dto.HearingDTO;
import org.openjudy.common.dto.ParticipantDTO;
import org.openjudy.common.enums.AudioProcessingStatus;
import org.openjudy.common.enums.HearingType;
import org.openjudy.common.enums.ParticipantRole;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@Path("/api/v1/hearings")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Tag(name = "Hearings", description = "Judicial hearings schedule and metadata endpoints")
@ApplicationScoped
public class HearingResource {

    private static final java.nio.file.Path STORE_PATH = java.nio.file.Path.of("target/populated-hearings.json");

    @Inject
    ObjectMapper objectMapper;

    private final List<HearingDTO> hearingList = new CopyOnWriteArrayList<>();
    private final Map<UUID, HearingDTO> hearings = new ConcurrentHashMap<>();

    private static final String DEFAULT_PROMPT_VERSION = "PROMPT_AUDIO_VIDEO_TRANSCRIPTION v3 (OPT_V1_DIARIZATION_SURGICAL)";
    private static final String DEFAULT_PIPELINE_VERSION = "v3.2-VAD-SYNC (gemini-3.8-flash)";

    private HearingDTO ensurePromptMetadata(HearingDTO h) {
        if (h == null) return null;
        String pv = (h.promptVersion() != null && !h.promptVersion().isBlank()) ? h.promptVersion() : DEFAULT_PROMPT_VERSION;
        String plv = (h.pipelineVersion() != null && !h.pipelineVersion().isBlank()) ? h.pipelineVersion() : DEFAULT_PIPELINE_VERSION;
        if (pv.equals(h.promptVersion()) && plv.equals(h.pipelineVersion())) {
            return h;
        }
        return new HearingDTO(
                h.id(),
                h.caseId(),
                h.caseNumber(),
                h.courtJurisdiction(),
                h.hearingType(),
                h.scheduledDateTime(),
                h.status(),
                h.mediaType(),
                h.audioUrl(),
                h.audioFilename(),
                h.audioDurationSeconds(),
                h.audioSizeBytes(),
                h.mediaUrl(),
                h.mediaFilename(),
                h.mediaDurationSeconds(),
                h.mediaSizeBytes(),
                h.participants(),
                h.transcriptSegments(),
                h.ataDraft(),
                h.summary(),
                pv,
                plv,
                h.createdAt(),
                h.updatedAt()
        );
    }

    @PostConstruct
    void init() {
        try {
            if (Files.exists(STORE_PATH)) {
                List<HearingDTO> loaded = objectMapper.readValue(
                        STORE_PATH.toFile(),
                        new TypeReference<List<HearingDTO>>() {}
                );
                for (HearingDTO raw : loaded) {
                    HearingDTO h = ensurePromptMetadata(raw);
                    if (h != null && h.id() != null) {
                        hearings.put(h.id(), h);
                        hearingList.add(h);
                    }
                }
            }
        } catch (Exception ignored) {}
    }

    private void saveToDisk() {
        try {
            Files.createDirectories(STORE_PATH.getParent());
            objectMapper.writeValue(STORE_PATH.toFile(), hearingList);
        } catch (Exception ignored) {}
    }

    @GET
    @Operation(summary = "List judicial hearings")
    public List<HearingDTO> listHearings() {
        return hearingList;
    }

    @GET
    @Path("/{id}")
    @Operation(summary = "Get judicial hearing details by ID")
    public Response getHearing(@PathParam("id") UUID id) {
        HearingDTO h = hearings.get(id);
        if (h == null) {
            if (!hearingList.isEmpty()) {
                return Response.ok(hearingList.get(0)).build();
            }
            return Response.status(Response.Status.NOT_FOUND).build();
        }
        return Response.ok(h).build();
    }

    @POST
    @Operation(summary = "Schedule or register a new judicial hearing")
    public Response createHearing(Map<String, Object> body) {
        UUID id = body != null && body.get("id") != null
                ? UUID.fromString(body.get("id").toString())
                : UUID.randomUUID();
        UUID caseId = body != null && body.get("caseId") != null
                ? UUID.fromString(body.get("caseId").toString())
                : id;
        String caseNumber = body != null && body.get("caseNumber") != null
                ? body.get("caseNumber").toString()
                : "0000000-00.2026.8.26.0100";
        String courtJurisdiction = body != null && body.get("courtJurisdiction") != null
                ? body.get("courtJurisdiction").toString().trim()
                : "";
        HearingType hearingType = HearingType.INSTRUCAO_E_JULGAMENTO;
        if (body != null && body.get("hearingType") != null) {
            try {
                hearingType = HearingType.valueOf(body.get("hearingType").toString());
            } catch (Exception ignored) {}
        }
        AudioProcessingStatus status = AudioProcessingStatus.PROCESSING_TRANSCRIPTION;
        if (body != null && body.get("status") != null) {
            try {
                status = AudioProcessingStatus.valueOf(body.get("status").toString());
            } catch (Exception ignored) {}
        }
        String mediaFilename = body != null && body.get("mediaFilename") != null
                ? body.get("mediaFilename").toString()
                : "gravacao_audiencia.mp4";
        double durationSeconds = 142.0;
        if (body != null && body.get("audioDurationSeconds") instanceof Number num) {
            durationSeconds = num.doubleValue();
        }
        long sizeBytes = 45000000L;
        if (body != null && body.get("audioSizeBytes") instanceof Number num) {
            sizeBytes = num.longValue();
        }
        org.openjudy.common.enums.MediaType mediaType = org.openjudy.common.enums.MediaType.VIDEO;
        if (body != null && body.get("mediaType") != null) {
            try {
                mediaType = org.openjudy.common.enums.MediaType.valueOf(body.get("mediaType").toString());
            } catch (Exception ignored) {}
        }
        List<ParticipantDTO> participants = parseParticipants(body != null ? body.get("participants") : null);
        Instant now = Instant.now();
        String encodedFilename = URLEncoder.encode(mediaFilename, StandardCharsets.UTF_8).replace("+", "%20");
        String defaultMediaUrl = "/media/hearings/" + encodedFilename;
        String mediaUrl = body != null && body.get("mediaUrl") != null && !body.get("mediaUrl").toString().isBlank()
                ? body.get("mediaUrl").toString()
                : defaultMediaUrl;

        String promptVersion = body != null && body.get("promptVersion") != null && !body.get("promptVersion").toString().isBlank()
                ? body.get("promptVersion").toString()
                : DEFAULT_PROMPT_VERSION;
        String pipelineVersion = body != null && body.get("pipelineVersion") != null && !body.get("pipelineVersion").toString().isBlank()
                ? body.get("pipelineVersion").toString()
                : DEFAULT_PIPELINE_VERSION;

        HearingDTO created = new HearingDTO(
                id,
                caseId,
                caseNumber,
                courtJurisdiction,
                hearingType,
                now,
                status,
                mediaType,
                mediaUrl,
                mediaFilename,
                durationSeconds,
                sizeBytes,
                mediaUrl,
                mediaFilename,
                durationSeconds,
                sizeBytes,
                participants,
                List.of(),
                null,
                null,
                promptVersion,
                pipelineVersion,
                now,
                now
        );
        hearings.put(id, created);
        hearingList.removeIf(h -> h.id().equals(id));
        hearingList.add(created);
        saveToDisk();

        boolean shouldEnqueue = body == null || !Boolean.FALSE.equals(body.get("enqueueTranscription"));
        if (shouldEnqueue) {
            triggerTranscriptionPipeline(id, caseNumber, mediaType.name(), mediaFilename);
        }

        return Response.status(Response.Status.CREATED).entity(created).build();
    }

    @PUT
    @Path("/{id}/metadata")
    @Operation(summary = "Update hearing pipeline status and AI-extracted metadata (participants, hearingType)")
    public Response updateHearingMetadata(@PathParam("id") UUID id, Map<String, Object> body) {
        HearingDTO existing = hearings.get(id);
        if (existing == null) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }

        AudioProcessingStatus updatedStatus = existing.status();
        if (body != null && body.get("status") != null) {
            try {
                updatedStatus = AudioProcessingStatus.valueOf(body.get("status").toString());
            } catch (Exception ignored) {}
        }

        HearingType updatedType = existing.hearingType();
        if (body != null && body.get("hearingType") != null) {
            try {
                updatedType = HearingType.valueOf(body.get("hearingType").toString());
            } catch (Exception ignored) {}
        }

        String updatedJurisdiction = existing.courtJurisdiction();
        if (body != null && body.containsKey("courtJurisdiction") && body.get("courtJurisdiction") != null) {
            updatedJurisdiction = body.get("courtJurisdiction").toString().trim();
        }

        List<ParticipantDTO> updatedParticipants = existing.participants();
        if (body != null && body.containsKey("participants")) {
            updatedParticipants = parseParticipants(body.get("participants"));
        }

        String updatedPromptVersion = existing.promptVersion() != null ? existing.promptVersion() : DEFAULT_PROMPT_VERSION;
        if (body != null && body.get("promptVersion") != null && !body.get("promptVersion").toString().isBlank()) {
            updatedPromptVersion = body.get("promptVersion").toString().trim();
        }

        String updatedPipelineVersion = existing.pipelineVersion() != null ? existing.pipelineVersion() : DEFAULT_PIPELINE_VERSION;
        if (body != null && body.get("pipelineVersion") != null && !body.get("pipelineVersion").toString().isBlank()) {
            updatedPipelineVersion = body.get("pipelineVersion").toString().trim();
        }

        HearingDTO updated = new HearingDTO(
                existing.id(),
                existing.caseId(),
                existing.caseNumber(),
                updatedJurisdiction,
                updatedType,
                existing.scheduledDateTime(),
                updatedStatus,
                existing.mediaType(),
                existing.mediaUrl(),
                existing.mediaFilename(),
                existing.mediaDurationSeconds(),
                existing.mediaSizeBytes(),
                existing.audioUrl(),
                existing.audioFilename(),
                existing.audioDurationSeconds(),
                existing.audioSizeBytes(),
                updatedParticipants,
                existing.transcriptSegments(),
                existing.ataDraft(),
                existing.summary(),
                updatedPromptVersion,
                updatedPipelineVersion,
                existing.createdAt(),
                Instant.now()
        );

        hearings.put(id, updated);
        for (int i = 0; i < hearingList.size(); i++) {
            if (hearingList.get(i).id().equals(id)) {
                hearingList.set(i, updated);
                break;
            }
        }
        saveToDisk();
        return Response.ok(updated).build();
    }

    private List<ParticipantDTO> parseParticipants(Object rawParticipants) {
        if (!(rawParticipants instanceof List<?> list) || list.isEmpty()) {
            return List.of();
        }
        java.util.ArrayList<ParticipantDTO> out = new java.util.ArrayList<>();
        for (Object item : list) {
            if (item instanceof Map<?, ?> m) {
                UUID pId = UUID.randomUUID();
                if (m.get("id") != null) {
                    try {
                        pId = UUID.fromString(m.get("id").toString());
                    } catch (Exception ignored) {}
                }
                String name = m.get("name") != null ? m.get("name").toString().trim() : "Participante";
                ParticipantRole role = ParticipantRole.OUTRO;
                if (m.get("role") != null) {
                    try {
                        role = ParticipantRole.valueOf(m.get("role").toString().trim().toUpperCase());
                    } catch (Exception ignored) {}
                }
                String doc = m.get("documentNumber") != null ? m.get("documentNumber").toString() : null;
                String email = m.get("email") != null ? m.get("email").toString() : null;
                String voiceId = m.get("voiceProfileId") != null ? m.get("voiceProfileId").toString() : null;
                boolean isPresent = m.get("isPresent") == null || Boolean.parseBoolean(m.get("isPresent").toString());
                out.add(new ParticipantDTO(pId, name, role, doc, email, voiceId, isPresent));
            }
        }
        return out;
    }

    private void triggerTranscriptionPipeline(UUID hearingId, String caseNumber, String mediaType, String filename) {
        triggerTranscriptionPipeline(hearingId, caseNumber, mediaType, filename, false);
    }

    private void triggerTranscriptionPipeline(UUID hearingId, String caseNumber, String mediaType, String filename, boolean forceReprocess) {
        String transcriptionBaseUrl = System.getenv().getOrDefault("TRANSCRIPTION_SERVICE_URL", "http://transcription-service:8083");
        try {
            String query = String.format(
                    "caseNumber=%s&mediaType=%s&filename=%s&forceReprocess=%s",
                    URLEncoder.encode(caseNumber, StandardCharsets.UTF_8),
                    URLEncoder.encode(mediaType, StandardCharsets.UTF_8),
                    URLEncoder.encode(filename, StandardCharsets.UTF_8),
                    forceReprocess
            );
            java.net.URI uri = java.net.URI.create(transcriptionBaseUrl + "/api/v1/transcriptions/enqueue/" + hearingId + "?" + query);
            java.net.http.HttpRequest req = java.net.http.HttpRequest.newBuilder(uri)
                    .POST(java.net.http.HttpRequest.BodyPublishers.noBody())
                    .timeout(java.time.Duration.ofSeconds(10))
                    .build();
            java.net.http.HttpClient.newHttpClient()
                    .sendAsync(req, java.net.http.HttpResponse.BodyHandlers.ofString());
        } catch (Exception ignored) {
        }
    }

    @POST
    @Path("/{id}/reprocess")
    @Operation(summary = "Reprocess transcription for a hearing using the active prompt template")
    public Response reprocessHearing(
            @PathParam("id") UUID id,
            @QueryParam("forceReprocess") @DefaultValue("true") boolean forceReprocess,
            Map<String, Object> body) {
        HearingDTO existing = hearings.get(id);
        String caseNumber = existing != null && existing.caseNumber() != null
                ? existing.caseNumber()
                : (body != null && body.get("caseNumber") != null ? body.get("caseNumber").toString() : "0000000-00.2026.8.26.0100");
        String mediaFilename = existing != null && existing.mediaFilename() != null
                ? existing.mediaFilename()
                : (body != null && body.get("mediaFilename") != null ? body.get("mediaFilename").toString() : "audiencia.mp4");
        String mediaType = existing != null && existing.mediaType() != null
                ? existing.mediaType().name()
                : (body != null && body.get("mediaType") != null ? body.get("mediaType").toString() : "VIDEO");
        if (body != null && body.get("forceReprocess") != null) {
            forceReprocess = Boolean.parseBoolean(body.get("forceReprocess").toString());
        }

        if (existing != null) {
            updateHearingMetadata(id, Map.of("status", AudioProcessingStatus.PROCESSING_TRANSCRIPTION.name()));
        }

        String transcriptionBaseUrl = System.getenv().getOrDefault("TRANSCRIPTION_SERVICE_URL", "http://transcription-service:8083");
        try {
            String payloadJson = objectMapper.writeValueAsString(Map.of(
                    "hearingId", id.toString(),
                    "caseNumber", caseNumber,
                    "mediaFilename", mediaFilename,
                    "filename", mediaFilename,
                    "mediaType", mediaType,
                    "forceReprocess", forceReprocess
            ));
            java.net.URI uri = java.net.URI.create(transcriptionBaseUrl + "/api/v1/transcriptions/process");
            java.net.http.HttpRequest req = java.net.http.HttpRequest.newBuilder(uri)
                    .header("Content-Type", "application/json")
                    .POST(java.net.http.HttpRequest.BodyPublishers.ofString(payloadJson))
                    .timeout(java.time.Duration.ofSeconds(10))
                    .build();
            java.net.http.HttpResponse<String> resp = java.net.http.HttpClient.newHttpClient()
                    .send(req, java.net.http.HttpResponse.BodyHandlers.ofString());
            if (resp.statusCode() >= 200 && resp.statusCode() < 300 && resp.body() != null && !resp.body().isBlank()) {
                return Response.status(resp.statusCode()).entity(resp.body()).type(MediaType.APPLICATION_JSON).build();
            }
        } catch (Exception e) {
            triggerTranscriptionPipeline(id, caseNumber, mediaType, mediaFilename, forceReprocess);
        }

        return Response.accepted(Map.of(
                "status", "ENQUEUED",
                "hearingId", id,
                "caseNumber", caseNumber,
                "mediaFilename", mediaFilename,
                "forceReprocess", forceReprocess,
                "endpoint", "/api/v1/hearings/" + id + "/reprocess"
        )).build();
    }

    @POST
    @Path("/{id}/transcript/blocks/{blockId}/reprocess")
    @Operation(summary = "Reprocess a specific transcript block of a hearing")
    public Response reprocessHearingBlock(
            @PathParam("id") UUID id,
            @PathParam("blockId") String blockId,
            Map<String, Object> body) {
        HearingDTO existing = hearings.get(id);
        String caseNumber = existing != null && existing.caseNumber() != null ? existing.caseNumber() : "0000000-00.2026.8.26.0100";
        String mediaFilename = existing != null && existing.mediaFilename() != null ? existing.mediaFilename() : "audiencia.mp4";
        String mediaType = existing != null && existing.mediaType() != null ? existing.mediaType().name() : "VIDEO";
        String transcriptionBaseUrl = System.getenv().getOrDefault("TRANSCRIPTION_SERVICE_URL", "http://transcription-service:8083");
        try {
            String payloadJson = objectMapper.writeValueAsString(Map.of(
                    "caseNumber", caseNumber,
                    "mediaFilename", mediaFilename,
                    "mediaType", mediaType
            ));
            java.net.URI uri = java.net.URI.create(transcriptionBaseUrl + "/api/v1/transcriptions/hearing/" + id + "/blocks/" + URLEncoder.encode(blockId, StandardCharsets.UTF_8) + "/reprocess");
            java.net.http.HttpRequest req = java.net.http.HttpRequest.newBuilder(uri)
                    .header("Content-Type", "application/json")
                    .POST(java.net.http.HttpRequest.BodyPublishers.ofString(payloadJson))
                    .timeout(java.time.Duration.ofSeconds(10))
                    .build();
            java.net.http.HttpResponse<String> resp = java.net.http.HttpClient.newHttpClient()
                    .send(req, java.net.http.HttpResponse.BodyHandlers.ofString());
            return Response.status(resp.statusCode()).entity(resp.body()).type(MediaType.APPLICATION_JSON).build();
        } catch (Exception e) {
            return Response.accepted(Map.of(
                    "status", "ENQUEUED",
                    "hearingId", id,
                    "blockId", blockId
            )).build();
        }
    }

    @POST
    @Path("/{id}/repair-timestamps")
    @Operation(summary = "Verify and repair collapsed or duplicate segment timestamps for a hearing")
    public Response repairHearingTimestamps(@PathParam("id") UUID id) {
        String transcriptionBaseUrl = System.getenv().getOrDefault("TRANSCRIPTION_SERVICE_URL", "http://transcription-service:8083");
        try {
            java.net.URI uri = java.net.URI.create(transcriptionBaseUrl + "/api/v1/transcriptions/hearing/" + id + "/repair-timestamps");
            java.net.http.HttpRequest req = java.net.http.HttpRequest.newBuilder(uri)
                    .POST(java.net.http.HttpRequest.BodyPublishers.noBody())
                    .timeout(java.time.Duration.ofSeconds(15))
                    .build();
            java.net.http.HttpResponse<String> resp = java.net.http.HttpClient.newHttpClient()
                    .send(req, java.net.http.HttpResponse.BodyHandlers.ofString());
            return Response.status(resp.statusCode()).entity(resp.body()).type(MediaType.APPLICATION_JSON).build();
        } catch (Exception e) {
            return Response.serverError().entity(Map.of("error", e.getMessage())).build();
        }
    }

    @GET
    @Path("/{id}/transcript/blocks")
    @Operation(summary = "Get partitioned transcript blocks and telemetry for a hearing")
    public Response getHearingTranscriptBlocks(@PathParam("id") UUID id) {
        String transcriptionBaseUrl = System.getenv().getOrDefault("TRANSCRIPTION_SERVICE_URL", "http://transcription-service:8083");
        try {
            java.net.URI uri = java.net.URI.create(transcriptionBaseUrl + "/api/v1/transcriptions/hearing/" + id + "/blocks");
            java.net.http.HttpRequest req = java.net.http.HttpRequest.newBuilder(uri)
                    .GET()
                    .timeout(java.time.Duration.ofSeconds(10))
                    .build();
            java.net.http.HttpResponse<String> resp = java.net.http.HttpClient.newHttpClient()
                    .send(req, java.net.http.HttpResponse.BodyHandlers.ofString());
            return Response.status(resp.statusCode()).entity(resp.body()).type(MediaType.APPLICATION_JSON).build();
        } catch (Exception e) {
            return Response.ok(List.of()).build();
        }
    }

    @GET
    @Path("/{id}/transcript")
    @Operation(summary = "Get transcript segments for a hearing")
    public Response getHearingTranscript(@PathParam("id") UUID id, @QueryParam("blockIndex") Integer blockIndex) {
        String transcriptionBaseUrl = System.getenv().getOrDefault("TRANSCRIPTION_SERVICE_URL", "http://transcription-service:8083");
        try {
            String suffix = blockIndex != null ? "?blockIndex=" + blockIndex : "";
            java.net.URI uri = java.net.URI.create(transcriptionBaseUrl + "/api/v1/transcriptions/hearing/" + id + suffix);
            java.net.http.HttpRequest req = java.net.http.HttpRequest.newBuilder(uri)
                    .GET()
                    .timeout(java.time.Duration.ofSeconds(10))
                    .build();
            java.net.http.HttpResponse<String> resp = java.net.http.HttpClient.newHttpClient()
                    .send(req, java.net.http.HttpResponse.BodyHandlers.ofString());
            return Response.status(resp.statusCode()).entity(resp.body()).type(MediaType.APPLICATION_JSON).build();
        } catch (Exception e) {
            return Response.ok(List.of()).build();
        }
    }

    @GET
    @Path("/{id}/summary")
    @Operation(summary = "Get AI legal summary and analysis for a hearing")
    public Response getHearingSummary(@PathParam("id") UUID id) {
        String transcriptionBaseUrl = System.getenv().getOrDefault("TRANSCRIPTION_SERVICE_URL", "http://transcription-service:8083");
        try {
            java.net.URI uri = java.net.URI.create(transcriptionBaseUrl + "/api/v1/ai/hearings/" + id + "/analysis");
            java.net.http.HttpRequest req = java.net.http.HttpRequest.newBuilder(uri)
                    .GET()
                    .timeout(java.time.Duration.ofSeconds(20))
                    .build();
            java.net.http.HttpResponse<String> resp = java.net.http.HttpClient.newHttpClient()
                    .send(req, java.net.http.HttpResponse.BodyHandlers.ofString());
            return Response.status(resp.statusCode()).entity(resp.body()).type(MediaType.APPLICATION_JSON).build();
        } catch (Exception e) {
            HearingDTO existing = hearings.get(id);
            if (existing != null && existing.summary() != null) {
                return Response.ok(existing.summary()).build();
            }
            return Response.serverError().entity(Map.of("error", e.getMessage())).build();
        }
    }

    @GET
    @Path("/{id}/analysis")
    @Operation(summary = "Get AI legal analysis and contradictions for a hearing")
    public Response getHearingAnalysis(@PathParam("id") UUID id) {
        return getHearingSummary(id);
    }

    @GET
    @Path("/{id}/analysis/status")
    @Operation(summary = "Get status of asynchronous AI legal analysis and contradiction task")
    public Response getHearingAnalysisStatus(@PathParam("id") UUID id) {
        String transcriptionBaseUrl = System.getenv().getOrDefault("TRANSCRIPTION_SERVICE_URL", "http://transcription-service:8083");
        try {
            java.net.URI uri = java.net.URI.create(transcriptionBaseUrl + "/api/v1/ai/hearings/" + id + "/analysis/status");
            java.net.http.HttpRequest req = java.net.http.HttpRequest.newBuilder(uri)
                    .GET()
                    .timeout(java.time.Duration.ofSeconds(10))
                    .build();
            java.net.http.HttpResponse<String> resp = java.net.http.HttpClient.newHttpClient()
                    .send(req, java.net.http.HttpResponse.BodyHandlers.ofString());
            return Response.status(resp.statusCode()).entity(resp.body()).type(MediaType.APPLICATION_JSON).build();
        } catch (Exception e) {
            return Response.ok(Map.of("hearingId", id, "status", "UNKNOWN")).build();
        }
    }

    @GET
    @Path("/{id}/contradictions")
    @Operation(summary = "Get AI-detected testimony contradictions for a hearing")
    public Response getHearingContradictions(@PathParam("id") UUID id) {
        String transcriptionBaseUrl = System.getenv().getOrDefault("TRANSCRIPTION_SERVICE_URL", "http://transcription-service:8083");
        try {
            java.net.http.HttpClient httpClient = java.net.http.HttpClient.newHttpClient();
            java.net.URI directUri = java.net.URI.create(transcriptionBaseUrl + "/api/v1/ai/hearings/" + id + "/contradictions");
            java.net.http.HttpRequest directReq = java.net.http.HttpRequest.newBuilder(directUri)
                    .GET()
                    .timeout(java.time.Duration.ofSeconds(15))
                    .build();
            java.net.http.HttpResponse<String> directResp = httpClient.send(directReq, java.net.http.HttpResponse.BodyHandlers.ofString());
            if (directResp.statusCode() >= 200 && directResp.statusCode() < 300 && directResp.body() != null && !directResp.body().isBlank()) {
                return Response.status(directResp.statusCode()).entity(directResp.body()).type(MediaType.APPLICATION_JSON).build();
            }

            java.net.URI analysisUri = java.net.URI.create(transcriptionBaseUrl + "/api/v1/ai/hearings/" + id + "/analysis");
            java.net.http.HttpRequest analysisReq = java.net.http.HttpRequest.newBuilder(analysisUri)
                    .GET()
                    .timeout(java.time.Duration.ofSeconds(20))
                    .build();
            java.net.http.HttpResponse<String> analysisResp = httpClient.send(analysisReq, java.net.http.HttpResponse.BodyHandlers.ofString());
            if (analysisResp.statusCode() >= 200 && analysisResp.statusCode() < 300 && analysisResp.body() != null) {
                com.fasterxml.jackson.databind.JsonNode root = objectMapper.readTree(analysisResp.body());
                if (root.has("contradictions")) {
                    return Response.ok(objectMapper.writeValueAsString(root.get("contradictions"))).type(MediaType.APPLICATION_JSON).build();
                }
            }
            return Response.ok(List.of()).build();
        } catch (Exception e) {
            return Response.ok(List.of()).build();
        }
    }

    @POST
    @Path("/{id}/analyze")
    @Operation(summary = "Trigger asynchronous AI legal summary and contradiction analysis task for a hearing")
    public Response analyzeHearing(
            @PathParam("id") UUID id,
            @QueryParam("force") @DefaultValue("true") boolean force,
            @QueryParam("sync") @DefaultValue("false") boolean sync) {
        String transcriptionBaseUrl = System.getenv().getOrDefault("TRANSCRIPTION_SERVICE_URL", "http://transcription-service:8083");
        try {
            java.net.http.HttpClient httpClient = java.net.http.HttpClient.newHttpClient();
            java.net.URI analyzeUri = java.net.URI.create(transcriptionBaseUrl + "/api/v1/ai/hearings/" + id + "/analyze?force=" + force + "&sync=" + sync);
            java.net.http.HttpRequest req = java.net.http.HttpRequest.newBuilder(analyzeUri)
                    .POST(java.net.http.HttpRequest.BodyPublishers.noBody())
                    .timeout(java.time.Duration.ofSeconds(60))
                    .build();
            java.net.http.HttpResponse<String> resp = httpClient.send(req, java.net.http.HttpResponse.BodyHandlers.ofString());
            if (resp.statusCode() >= 200 && resp.statusCode() < 300 && resp.body() != null && !resp.body().isBlank()) {
                return Response.status(resp.statusCode()).entity(resp.body()).type(MediaType.APPLICATION_JSON).build();
            }

            // Fallback: trigger /analysis asynchronously if /analyze is not yet exposed
            java.net.URI fallbackUri = java.net.URI.create(transcriptionBaseUrl + "/api/v1/ai/hearings/" + id + "/analysis");
            java.net.http.HttpRequest fallbackReq = java.net.http.HttpRequest.newBuilder(fallbackUri)
                    .GET()
                    .timeout(java.time.Duration.ofSeconds(60))
                    .build();
            httpClient.sendAsync(fallbackReq, java.net.http.HttpResponse.BodyHandlers.ofString());
            return Response.accepted(Map.of(
                    "status", "ENQUEUED",
                    "hearingId", id,
                    "endpoint", "/api/v1/hearings/" + id + "/analyze"
            )).build();
        } catch (Exception e) {
            return Response.accepted(Map.of(
                    "status", "ENQUEUED",
                    "hearingId", id,
                    "endpoint", "/api/v1/hearings/" + id + "/analyze"
            )).build();
        }
    }

    @DELETE
    @Path("/{id}")
    @Operation(summary = "Delete a judicial hearing by ID")
    public Response deleteHearing(@PathParam("id") UUID id) {
        hearings.remove(id);
        hearingList.removeIf(h -> h.id().equals(id));
        saveToDisk();
        return Response.noContent().build();
    }

    @DELETE
    @Path("/all")
    @Operation(summary = "Clear all judicial hearings")
    public Response clearAllHearings() {
        hearings.clear();
        hearingList.clear();
        saveToDisk();
        return Response.noContent().build();
    }
}
