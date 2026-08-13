package org.openjudy.agentgarden.service;

import io.smallrye.mutiny.Multi;
import io.smallrye.mutiny.infrastructure.Infrastructure;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.openjudy.agentgarden.model.*;

import java.time.Duration;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@ApplicationScoped
public class StreamAssistService {

    @ConfigProperty(name = "gcp.project-id", defaultValue = "open-judy-cloud")
    String projectId;

    @ConfigProperty(name = "gcp.location", defaultValue = "global")
    String location;

    @ConfigProperty(name = "gcp.endpoint-location", defaultValue = "global")
    String endpointLocation;

    @ConfigProperty(name = "gcp.app-id", defaultValue = "judy-legal-agents")
    String appId;

    @ConfigProperty(name = "gcp.assistant-id", defaultValue = "default_assistant")
    String assistantId;

    @Inject
    AgentRegistryService agentRegistryService;

    private final Map<String, SessionInfo> activeSessions = new ConcurrentHashMap<>();

    public String buildStreamAssistUrl() {
        return String.format(
                "https://%s-discoveryengine.googleapis.com/v1/projects/%s/locations/%s/collections/default_collection/engines/%s/assistants/%s:streamAssist",
                endpointLocation, projectId, location, appId, assistantId
        );
    }

    public SessionInfo createOrGetSession(String sessionId, String agentId, String title) {
        if (sessionId != null && activeSessions.containsKey(sessionId)) {
            SessionInfo existing = activeSessions.get(sessionId);
            existing.setLastActiveAt(Instant.now());
            return existing;
        }

        String sid = (sessionId != null && !sessionId.isBlank()) ? sessionId : "sess-" + UUID.randomUUID().toString().substring(0, 12);
        String gcpSessionPath = String.format(
                "projects/%s/locations/%s/collections/default_collection/engines/%s/sessions/%s",
                projectId, location, appId, sid
        );

        SessionInfo sessionInfo = new SessionInfo(sid, gcpSessionPath, agentId, title != null ? title : "Consulta Judicial");
        activeSessions.put(sid, sessionInfo);
        return sessionInfo;
    }

    @jakarta.annotation.PostConstruct
    void initSampleSessions() {
        // Jurisprudência sessions
        SessionInfo s1 = new SessionInfo("sess-juris-101", "projects/" + projectId + "/sessions/s101", "agent-juris-01", "Tema 1.046 STF e Acordos Coletivos");
        s1.setTurnCount(4);
        s1.setQueryHistory(List.of("Qual o alcance do Tema 1.046 do STF?", "Como aplicar a cláusula compensatória?"));
        activeSessions.put(s1.getSessionId(), s1);

        SessionInfo s2 = new SessionInfo("sess-juris-102", "projects/" + projectId + "/sessions/s102", "agent-juris-01", "Súmula Vinculante 56 e Regime Prisional");
        s2.setTurnCount(2);
        s2.setQueryHistory(List.of("Diretrizes de falta de vagas no regime semiaberto."));
        activeSessions.put(s2.getSessionId(), s2);

        // Contradições sessions
        SessionInfo s3 = new SessionInfo("sess-contra-201", "projects/" + projectId + "/sessions/s201", "agent-contradiction-02", "Audiência de Instrução - Proc. 0014238");
        s3.setHearingId("f1e2d3c4-b5a6-9788-7654-3210fedcba98");
        s3.setTurnCount(5);
        s3.setQueryHistory(List.of("Houve contradição sobre a notificação prévia?", "Confrontar horários da testemunha."));
        activeSessions.put(s3.getSessionId(), s3);

        // Redator sessions
        SessionInfo s4 = new SessionInfo("sess-draft-301", "projects/" + projectId + "/sessions/s301", "agent-drafter-03", "Minuta de Despacho Saneador - Proc. 0004521");
        s4.setHearingId("f1e2d3c4-b5a6-9788-7654-3210fedcba98");
        s4.setTurnCount(3);
        s4.setQueryHistory(List.of("Elaborar saneamento com fixação de pontos controvertidos."));
        activeSessions.put(s4.getSessionId(), s4);

        // Pautas sessions
        SessionInfo s5 = new SessionInfo("sess-docket-401", "projects/" + projectId + "/sessions/s401", "agent-docket-04", "Prazos Peremptórios da Vara Cível");
        s5.setTurnCount(6);
        s5.setQueryHistory(List.of("Quais prazos vencem nesta semana?"));
        activeSessions.put(s5.getSessionId(), s5);
    }

    public Optional<SessionInfo> getSession(String sessionId) {
        return Optional.ofNullable(activeSessions.get(sessionId));
    }

    public List<SessionInfo> listSessions() {
        return new ArrayList<>(activeSessions.values());
    }

    public List<SessionInfo> listSessionsByAgent(String agentId) {
        return activeSessions.values().stream()
                .filter(s -> agentId.equalsIgnoreCase(s.getAgentId()))
                .sorted(Comparator.comparing(SessionInfo::getLastActiveAt).reversed())
                .toList();
    }

    /**
     * Streams answers using StreamAssist architecture.
     * Emits:
     *  1. PLANNER_STEP (Formulating Query / Search Strategy)
     *  2. PLANNER_STEP (Querying Enterprise Data Stores & Agents)
     *  3. GROUNDED_CHUNK (Streamed markdown response words/tokens)
     *  4. CITATION (Grounded citations with precedent URLs / timestamps)
     *  5. COMPLETE
     */
    public Multi<StreamAssistChunk> streamAssist(StreamAssistRequest request) {
        final SessionInfo session = createOrGetSession(
                request.getSessionId(),
                request.getAgentId() != null ? request.getAgentId() : "agent-juris-01",
                request.getQueryText()
        );

        session.setTurnCount(session.getTurnCount() + 1);
        session.getQueryHistory().add(request.getQueryText());

        EnterpriseAgent agent = agentRegistryService.getAgent(session.getAgentId())
                .orElseGet(() -> agentRegistryService.listAgents().get(0));

        // Generate response chunks based on query & agent specialization
        List<StreamAssistChunk> events = buildStreamEvents(request, session, agent);

        // Emit chunks with small intervals to simulate streaming reactive flow
        return Multi.createFrom().iterable(events)
                .onItem().call(item -> io.smallrye.mutiny.Uni.createFrom().nullItem().onItem().delayIt().by(Duration.ofMillis(80)))
                .runSubscriptionOn(Infrastructure.getDefaultExecutor());
    }

    private List<StreamAssistChunk> buildStreamEvents(StreamAssistRequest request, SessionInfo session, EnterpriseAgent agent) {
        List<StreamAssistChunk> events = new ArrayList<>();
        String stepId = "step-" + UUID.randomUUID().toString().substring(0, 8);

        // 1. Planner Steps
        events.add(StreamAssistChunk.plannerStep(
                String.format("Identificando escopo temático com agente [%s]...", agent.getName()),
                stepId
        ));

        events.add(StreamAssistChunk.plannerStep(
                String.format("Consultando data stores [%s] no Gemini Enterprise...", String.join(", ", agent.getDataStores())),
                stepId
        ));

        events.add(StreamAssistChunk.plannerStep(
                "Sintetizando fundamentação jurídica e mapeando precedentes judiciais...",
                stepId
        ));

        // 2. Stream Grounded Text Chunks
        String answerMarkdown = generateLegalAnswer(request.getQueryText(), agent);
        String[] tokens = answerMarkdown.split(" ");
        StringBuilder currentBuffer = new StringBuilder();

        for (int i = 0; i < tokens.length; i++) {
            currentBuffer.append(tokens[i]).append(" ");
            if ((i + 1) % 4 == 0 || i == tokens.length - 1) {
                events.add(StreamAssistChunk.groundedChunk(currentBuffer.toString(), session.getSessionId()));
                currentBuffer.setLength(0);
            }
        }

        // 3. Citations
        List<Citation> citations = generateCitations(request.getQueryText(), agent);
        events.add(StreamAssistChunk.citationEvent(citations));

        // 4. Complete
        events.add(StreamAssistChunk.complete(session.getSessionId()));

        return events;
    }

    private String generateLegalAnswer(String query, EnterpriseAgent agent) {
        if (query.toLowerCase().contains("conciliação") || query.toLowerCase().contains("acordo")) {
            return "Com base na análise dos registros da sessão e nos precedentes vinculantes do tribunal, constata-se que houve **tentativa de conciliação** inicial proposta pelo Juízo. "
                    + "Entretanto, não houve consenso quanto ao quantum indenizatório referente à rescisão contratual, motivo pelo qual foi fixado saneamento para produção de prova testemunhal.\n\n"
                    + "### Diretrizes Relevantes:\n"
                    + "- **Art. 334 do CPC**: Obrigatoriedade da audiência de autocomposição cumprida.\n"
                    + "- **Enunciado FONAJE nº 28**: Possibilidade de nova composição até o encerramento da instrução.";
        }

        if (query.toLowerCase().contains("contradição") || query.toLowerCase().contains("depoimento")) {
            return "Foram identificadas **duas divergências fáticas relevantes** entre o depoimento do preposto e a oitiva da testemunha ocular:\n\n"
                    + "1. **Data da Notificação**: O preposto afirmou envio em 15/03/2024, enquanto a testemunha declarou recebimento posterior em 28/03/2024.\n"
                    + "2. **Presença no Local da Obra**: Divergência sobre a fiscalização técnica dos serviços prestados.\n\n"
                    + "Recomenda-se ponderação probatória à luz do **Art. 371 do CPC** (Livre convencimento motivado).";
        }

        return String.format(
                "Em resposta à consulta sobre *\"%s\"*, o agente **%s** processou os corpora cadastrados no Gemini Enterprise com as seguintes conclusões fundamentadas:\n\n"
                + "- **Tese Aplicável**: Conformidade com a jurisprudência dominante e precedentes qualificados dos Tribunais Superiores.\n"
                + "- **Fundamento Normativo**: Atendimento aos requisitos legais e processuais pertinentes.\n"
                + "- **Recomendação**: Aplicação da tese fixada sob a sistemática dos recursos repetitivos para conferir segurança jurídica à deliberação judicial.",
                query, agent.getName()
        );
    }

    private List<Citation> generateCitations(String query, EnterpriseAgent agent) {
        List<Citation> list = new ArrayList<>();
        list.add(new Citation(
                "STF - Tema 1.046 com Repercussão Geral",
                "https://portal.stf.jus.br/jurisprudencia/repercussao/tema.asp?num=1046",
                "Validade de norma coletiva de trabalho que limita direitos trabalhistas não assegurados constitucionalmente.",
                "STF",
                "Tema 1046",
                0.96
        ));
        list.add(new Citation(
                "STJ - Súmula 543",
                "https://www.stj.jus.br/docs_internet/revista/eletronica/stj-revista-sumulas-2015_42_capSumula543.pdf",
                "Resolução de contrato de promessa de compra e venda de imóvel e restituição de parcelas.",
                "STJ",
                "Súmula 543",
                0.92
        ));
        return list;
    }
}
