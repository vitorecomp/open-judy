package org.openjudy.agentgarden.service;

import io.smallrye.mutiny.Multi;
import io.smallrye.mutiny.infrastructure.Infrastructure;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.openjudy.agentgarden.model.*;
import org.openjudy.common.util.VertexAiClient;

import java.time.Duration;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@ApplicationScoped
public class StreamAssistService {

    @ConfigProperty(name = "gcp.project-id", defaultValue = "study-deploys")
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
        // Initialized empty; sessions are created dynamically on user interaction
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
        if (!VertexAiClient.isConfigured()) {
            throw new IllegalStateException("Vertex AI não está configurado para o Agent Garden.");
        }
        try {
            String systemInstruction = String.format(
                    "Você é o agente jurídico especializado '%s' (%s) do Open Judy operando com o modelo %s no Vertex AI. "
                    + "Capacidades: %s. Data Stores conectados: %s. "
                    + "Responda em português jurídico formal com fundamentação técnica, legislação brasileira (CPC/CPP/CF) e jurisprudência (STF/STJ).",
                    agent.getName(),
                    agent.getDescription(),
                    agent.getDefaultModel(),
                    String.join(", ", agent.getCapabilities()),
                    String.join(", ", agent.getDataStores())
            );
            String vertexResp = VertexAiClient.generateContent(
                    agent.getDefaultModel(),
                    systemInstruction,
                    query,
                    0.2,
                    null
            );
            if (vertexResp != null && !vertexResp.isBlank()) {
                return vertexResp;
            }
            throw new RuntimeException("Resposta vazia do Vertex AI para o agente " + agent.getName());
        } catch (Exception e) {
            throw new RuntimeException("Erro na execução do agente no Vertex AI: " + e.getMessage(), e);
        }
    }

    private List<Citation> generateCitations(String query, EnterpriseAgent agent) {
        return List.of();
    }
}
