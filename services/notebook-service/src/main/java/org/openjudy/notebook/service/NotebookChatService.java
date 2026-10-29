package org.openjudy.notebook.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.agroal.api.AgroalDataSource;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.jboss.logging.Logger;
import org.openjudy.common.util.VertexAiClient;
import org.openjudy.notebook.dto.*;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@ApplicationScoped
public class NotebookChatService {

    private static final Logger LOG = Logger.getLogger(NotebookChatService.class);

    @Inject
    AgroalDataSource dataSource;

    @Inject
    NotebookService notebookService;

    @Inject
    ObjectMapper objectMapper;

    @ConfigProperty(name = "gemini.model", defaultValue = "gemini-4-argon")
    String geminiModel;

    public NotebookChatResponse processChat(UUID notebookId, NotebookChatRequest request) {
        String question = request.question();
        NotebookDTO notebook = notebookService.getNotebook(notebookId);
        if (notebook == null) {
            throw new IllegalArgumentException("Notebook não encontrado: " + notebookId);
        }

        // Determine active sources
        List<NotebookSourceDTO> activeSources = notebook.sources().stream()
                .filter(s -> {
                    if (request.activeSourceIds() != null && !request.activeSourceIds().isEmpty()) {
                        return request.activeSourceIds().contains(s.id());
                    }
                    return s.isActiveForChat();
                })
                .toList();

        List<String> activeTitles = activeSources.stream().map(NotebookSourceDTO::title).toList();
        int totalTokens = activeSources.stream().mapToInt(NotebookSourceDTO::estimatedTokens).sum();

        // Assemble contextual synthesis and citations
        String answer;
        List<NotebookChatMessageDTO.CitationDTO> citations = new ArrayList<>();

        if (activeSources.isEmpty()) {
            answer = "Nenhuma fonte de contexto está selecionada no momento. Por favor, marque ao menos uma fonte (Bloco de Vídeo, Transcrição, Petição ou Jurisprudência) na barra lateral para direcionar o chat do caderno.";
        } else {
            StringBuilder contextPrompt = new StringBuilder();
            contextPrompt.append("Você é o Assistente Judiciário Open Judy integrado ao Caderno: '")
                         .append(notebook.title()).append("'.\n")
                         .append("Contexto das fontes ativas selecionadas pelo magistrado:\n\n");

            for (NotebookSourceDTO src : activeSources) {
                contextPrompt.append("=== FONTE [").append(src.sourceType()).append("]: ").append(src.title()).append(" ===\n")
                             .append(src.content() != null ? src.content() : "Conteúdo referenciado: " + src.referenceId()).append("\n\n");

                citations.add(new NotebookChatMessageDTO.CitationDTO(
                        src.title(),
                        src.content() != null && src.content().length() > 120 ? src.content().substring(0, 120) + "..." : src.content(),
                        src.referenceId() != null ? "/hearings/" + src.referenceId() : null
                ));
            }

            answer = generateJudicialAnswer(question, notebook, activeSources, contextPrompt.toString());
        }

        UUID messageId = UUID.randomUUID();
        saveChatMessage(notebookId, "user", question, activeTitles, List.of(), 50);
        saveChatMessage(notebookId, "assistant", answer, activeTitles, citations, totalTokens);

        return new NotebookChatResponse(
                messageId,
                answer,
                activeTitles,
                citations,
                totalTokens
        );
    }

    private String generateJudicialAnswer(String question, NotebookDTO notebook, List<NotebookSourceDTO> activeSources, String contextPrompt) {
        if (!VertexAiClient.isConfigured()) {
            throw new IllegalStateException("Vertex AI não está configurado para o serviço de Cadernos.");
        }
        try {
            String systemInstruction = "Você é o Judy Copilot (Gemini 4 Argon), assistente jurídico do magistrado brasileiro integrado ao Caderno de Pesquisa do Open Judy. "
                    + "Responda em português jurídico claro, citando especificamente as fontes ativas fornecidas no contexto.";
            String fullPrompt = contextPrompt + "\n=== PERGUNTA DO MAGISTRADO ===\n" + question;
            String vertexResp = VertexAiClient.generateContent(geminiModel, systemInstruction, fullPrompt, 0.2, null);
            if (vertexResp != null && !vertexResp.isBlank()) {
                return vertexResp;
            }
            throw new RuntimeException("Resposta vazia do modelo " + geminiModel);
        } catch (Exception e) {
            LOG.error("Vertex AI call failed in NotebookChatService", e);
            throw new RuntimeException("Erro ao consultar o modelo " + geminiModel + " no Vertex AI: " + e.getMessage(), e);
        }
    }

    private void saveChatMessage(UUID notebookId, String role, String content, List<String> sources, List<NotebookChatMessageDTO.CitationDTO> citations, int tokens) {
        String sql = "INSERT INTO tb_notebook_chat_messages (id, notebook_id, role, content, active_sources_json, citations_json, tokens_used, created_at) " +
                     "VALUES (?, ?, ?, ?, ?::jsonb, ?::jsonb, ?, ?)";

        try (Connection conn = dataSource.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {

            ps.setObject(1, UUID.randomUUID());
            ps.setObject(2, notebookId);
            ps.setString(3, role);
            ps.setString(4, content);
            ps.setString(5, objectMapper.writeValueAsString(sources));
            ps.setString(6, objectMapper.writeValueAsString(citations));
            ps.setInt(7, tokens);
            ps.setTimestamp(8, Timestamp.from(Instant.now()));

            ps.executeUpdate();
        } catch (Exception e) {
            LOG.error("Error saving notebook chat message", e);
        }
    }

    public List<NotebookChatMessageDTO> getChatHistory(UUID notebookId) {
        List<NotebookChatMessageDTO> list = new ArrayList<>();
        String sql = "SELECT id, notebook_id, role, content, active_sources_json, citations_json, tokens_used, created_at " +
                     "FROM tb_notebook_chat_messages WHERE notebook_id = ? ORDER BY created_at ASC";

        try (Connection conn = dataSource.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {

            ps.setObject(1, notebookId);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    Timestamp cTs = rs.getTimestamp("created_at");
                    List<String> activeSources = List.of();
                    List<NotebookChatMessageDTO.CitationDTO> citations = List.of();
                    String sourcesJson = rs.getString("active_sources_json");
                    if (sourcesJson != null && !sourcesJson.isBlank()) {
                        try {
                            activeSources = objectMapper.readValue(
                                    sourcesJson,
                                    new com.fasterxml.jackson.core.type.TypeReference<List<String>>() {}
                            );
                        } catch (Exception ignored) {
                        }
                    }
                    String citationsJson = rs.getString("citations_json");
                    if (citationsJson != null && !citationsJson.isBlank()) {
                        try {
                            citations = objectMapper.readValue(
                                    citationsJson,
                                    new com.fasterxml.jackson.core.type.TypeReference<List<NotebookChatMessageDTO.CitationDTO>>() {}
                            );
                        } catch (Exception ignored) {
                        }
                    }
                    list.add(new NotebookChatMessageDTO(
                            (UUID) rs.getObject("id"),
                            (UUID) rs.getObject("notebook_id"),
                            rs.getString("role"),
                            rs.getString("content"),
                            activeSources,
                            citations,
                            rs.getInt("tokens_used"),
                            cTs != null ? cTs.toInstant() : Instant.now()
                    ));
                }
            }
        } catch (Exception e) {
            LOG.error("Error retrieving chat history", e);
        }
        return list;
    }
}
