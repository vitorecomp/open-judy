package org.openjudy.caseservice.resource;

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

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Path("/api/v1/hearings")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Tag(name = "Hearings", description = "Judicial hearings schedule and metadata endpoints")
public class HearingResource {

    private static final List<HearingDTO> SEEDED_HEARINGS = List.of(
            new HearingDTO(
                    UUID.fromString("f1e2d3c4-b5a6-9788-7654-3210fedcba98"),
                    UUID.fromString("a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d"),
                    "0004521-88.2024.8.26.0100",
                    "3ª Vara Cível Central da Comarca de São Paulo/SP",
                    HearingType.INSTRUCAO_E_JULGAMENTO,
                    Instant.parse("2026-08-06T14:00:00Z"),
                    AudioProcessingStatus.READY,
                    org.openjudy.common.enums.MediaType.VIDEO,
                    "",
                    "audiencia_0004521_instrucao.mp4",
                    142.0,
                    48500000L,
                    "",
                    "audiencia_0004521_instrucao.mp4",
                    142.0,
                    48500000L,
                    List.of(
                            new ParticipantDTO(UUID.fromString("aa000000-0000-0000-0000-000000000001"), "Dra. Camila Vasconcelos de Albuquerque", ParticipantRole.MAGISTRADO, "TJSP-44910", "camila.vasconcelos@tjsp.jus.br", null, true),
                            new ParticipantDTO(UUID.fromString("aa000000-0000-0000-0000-000000000002"), "Dr. Lucas Menezes Braga", ParticipantRole.ADVOGADO_AUTOR, "OAB/SP 389.122", "lucas.menezes@advocacia.com.br", null, true),
                            new ParticipantDTO(UUID.fromString("aa000000-0000-0000-0000-000000000003"), "Dra. Beatriz Fontana Rezende", ParticipantRole.ADVOGADO_REU, "OAB/SP 412.508", "beatriz.fontana@advocacia.com.br", null, true),
                            new ParticipantDTO(UUID.fromString("aa000000-0000-0000-0000-000000000004"), "Mariana Ribeiro Silva", ParticipantRole.AUTOR, "CPF 312.455.908-11", "mariana.silva@email.com", null, true),
                            new ParticipantDTO(UUID.fromString("aa000000-0000-0000-0000-000000000005"), "Carlos Eduardo Prado", ParticipantRole.TESTEMUNHA, "RG 28.910.443-X", null, null, true)
                    ),
                    List.of(),
                    null,
                    null,
                    Instant.parse("2026-08-06T14:00:00Z"),
                    Instant.parse("2026-08-06T14:25:00Z")
            ),
            new HearingDTO(
                    UUID.fromString("b2c3d4e5-f6a7-8901-2345-67890abcdef1"),
                    UUID.fromString("b2c3d4e5-f6a7-8901-2345-67890abcdef1"),
                    "0005891-12.2024.8.26.0100",
                    "1ª Vara Cível de Santo Amaro/SP",
                    HearingType.CONCILIACAO,
                    Instant.parse("2026-08-07T10:30:00Z"),
                    AudioProcessingStatus.READY,
                    org.openjudy.common.enums.MediaType.AUDIO,
                    "",
                    "audiencia_0005891_conciliacao.mp3",
                    210.0,
                    24500000L,
                    "",
                    "audiencia_0005891_conciliacao.mp3",
                    210.0,
                    24500000L,
                    List.of(
                            new ParticipantDTO(UUID.randomUUID(), "Dra. Camila Vasconcelos de Albuquerque", ParticipantRole.MAGISTRADO, "TJSP-44910", null, null, true),
                            new ParticipantDTO(UUID.randomUUID(), "Roberto Almeida Santos", ParticipantRole.AUTOR, null, null, null, true),
                            new ParticipantDTO(UUID.randomUUID(), "Dra. Juliana Mendes", ParticipantRole.ADVOGADO_REU, null, null, null, true)
                    ),
                    List.of(),
                    null,
                    null,
                    Instant.parse("2026-08-07T10:30:00Z"),
                    Instant.parse("2026-08-07T11:05:00Z")
            ),
            new HearingDTO(
                    UUID.fromString("c3d4e5f6-a7b8-9012-3456-78901abcdef2"),
                    UUID.fromString("c3d4e5f6-a7b8-9012-3456-78901abcdef2"),
                    "0009142-45.2024.8.26.0002",
                    "14ª Vara do Trabalho de São Paulo/SP",
                    HearingType.UNA,
                    Instant.parse("2026-08-07T14:15:00Z"),
                    AudioProcessingStatus.READY,
                    org.openjudy.common.enums.MediaType.VIDEO,
                    "",
                    "audiencia_0009142_trabalhista.webm",
                    340.0,
                    89000000L,
                    "",
                    "audiencia_0009142_trabalhista.webm",
                    340.0,
                    89000000L,
                    List.of(
                            new ParticipantDTO(UUID.randomUUID(), "Dr. Marcos Valério Silveira", ParticipantRole.MAGISTRADO, null, null, null, true),
                            new ParticipantDTO(UUID.randomUUID(), "Fernando Costa Lima", ParticipantRole.AUTOR, null, null, null, true),
                            new ParticipantDTO(UUID.randomUUID(), "Dr. Marcelo Fagundes", ParticipantRole.ADVOGADO_AUTOR, null, null, null, true)
                    ),
                    List.of(),
                    null,
                    null,
                    Instant.parse("2026-08-07T14:15:00Z"),
                    Instant.parse("2026-08-07T15:00:00Z")
            ),
            new HearingDTO(
                    UUID.fromString("d4e5f6a7-b8c9-0123-4567-89012abcdef3"),
                    UUID.fromString("d4e5f6a7-b8c9-0123-4567-89012abcdef3"),
                    "0012490-88.2024.8.26.0050",
                    "Vara das Audiências de Custódia da Capital",
                    HearingType.CUSTODIA,
                    Instant.parse("2026-08-08T09:00:00Z"),
                    AudioProcessingStatus.PENDING,
                    org.openjudy.common.enums.MediaType.VIDEO,
                    "",
                    "audiencia_0012490_custodia.mp4",
                    180.0,
                    42000000L,
                    "",
                    "audiencia_0012490_custodia.mp4",
                    180.0,
                    42000000L,
                    List.of(
                            new ParticipantDTO(UUID.randomUUID(), "Dra. Renata Souza", ParticipantRole.MAGISTRADO, null, null, null, true),
                            new ParticipantDTO(UUID.randomUUID(), "Paulo Henrique Guedes", ParticipantRole.REU, null, null, null, true),
                            new ParticipantDTO(UUID.randomUUID(), "Dr. Thiago Ribeiro", ParticipantRole.DEFENSOR_PUBLICO, null, null, null, true)
                    ),
                    List.of(),
                    null,
                    null,
                    Instant.parse("2026-08-08T09:00:00Z"),
                    Instant.parse("2026-08-08T09:20:00Z")
            ),
            new HearingDTO(
                    UUID.fromString("e5f6a7b8-c9d0-1234-5678-90123abcdef4"),
                    UUID.fromString("e5f6a7b8-c9d0-1234-5678-90123abcdef4"),
                    "0015782-33.2024.8.26.0100",
                    "7ª Vara de Família e Sucessões Central",
                    HearingType.INTERROGATORIO,
                    Instant.parse("2026-08-08T11:00:00Z"),
                    AudioProcessingStatus.PROCESSING_TRANSCRIPTION,
                    org.openjudy.common.enums.MediaType.VIDEO,
                    "",
                    "audiencia_0015782_interrogatorio.mp4",
                    280.0,
                    75000000L,
                    "",
                    "audiencia_0015782_interrogatorio.mp4",
                    280.0,
                    75000000L,
                    List.of(
                            new ParticipantDTO(UUID.randomUUID(), "Dra. Camila Vasconcelos de Albuquerque", ParticipantRole.MAGISTRADO, null, null, null, true),
                            new ParticipantDTO(UUID.randomUUID(), "Vitória Kate Santos", ParticipantRole.TESTEMUNHA, null, null, null, true),
                            new ParticipantDTO(UUID.randomUUID(), "Dr. André Villela", ParticipantRole.ADVOGADO_AUTOR, null, null, null, true)
                    ),
                    List.of(),
                    null,
                    null,
                    Instant.parse("2026-08-08T11:00:00Z"),
                    Instant.parse("2026-08-08T11:30:00Z")
            )
    );

    private final List<HearingDTO> hearingList = new java.util.concurrent.CopyOnWriteArrayList<>(SEEDED_HEARINGS);
    private final Map<UUID, HearingDTO> hearings = new ConcurrentHashMap<>();

    public HearingResource() {
        for (HearingDTO h : SEEDED_HEARINGS) {
            hearings.put(h.id(), h);
        }
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
        HearingDTO h = hearings.getOrDefault(id, SEEDED_HEARINGS.get(0));
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
                ? body.get("courtJurisdiction").toString()
                : "3ª Vara Cível Central da Comarca de São Paulo/SP";
        HearingType hearingType = HearingType.INSTRUCAO_E_JULGAMENTO;
        if (body != null && body.get("hearingType") != null) {
            try {
                hearingType = HearingType.valueOf(body.get("hearingType").toString());
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
        Instant now = Instant.now();

        HearingDTO created = new HearingDTO(
                id,
                caseId,
                caseNumber,
                courtJurisdiction,
                hearingType,
                now,
                AudioProcessingStatus.READY,
                mediaType,
                "",
                mediaFilename,
                durationSeconds,
                sizeBytes,
                "",
                mediaFilename,
                durationSeconds,
                sizeBytes,
                SEEDED_HEARINGS.get(0).participants(),
                List.of(),
                null,
                null,
                now,
                now
        );
        hearings.put(id, created);
        hearingList.removeIf(h -> h.id().equals(id));
        hearingList.add(0, created);
        return Response.status(Response.Status.CREATED).entity(created).build();
    }

    @DELETE
    @Path("/{id}")
    @Operation(summary = "Delete a judicial hearing by ID")
    public Response deleteHearing(@PathParam("id") UUID id) {
        hearings.remove(id);
        hearingList.removeIf(h -> h.id().equals(id));
        return Response.noContent().build();
    }
}
