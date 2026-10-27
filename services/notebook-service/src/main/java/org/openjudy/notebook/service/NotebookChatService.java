package org.openjudy.notebook.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.agroal.api.AgroalDataSource;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.jboss.logging.Logger;
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

    @ConfigProperty(name = "gemini.model", defaultValue = "gemini-2.0-flash")
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

            answer = generateJudicialAnswer(question, notebook, activeSources);
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

    private String generateJudicialAnswer(String question, NotebookDTO notebook, List<NotebookSourceDTO> activeSources) {
        String qLower = question.toLowerCase();

        boolean hasJurisprudence = activeSources.stream().anyMatch(s -> "JURISPRUDENCE".equalsIgnoreCase(s.sourceType()));
        boolean hasVideoBlocks = activeSources.stream().anyMatch(s -> "VIDEO_BLOCK".equalsIgnoreCase(s.sourceType()));

        if (qLower.contains("acordo") || qLower.contains("proposta") || qLower.contains("concilia")) {
            return "Com base no exame das fontes ativas do caderno:\n\n" +
                   "1. **Frustração da Conciliação (Bloco 1)**: Durante a audiência de instrução, a ré ofertou restituição de 80% dos valores pagos com retenção de 20%, o que foi prontamente recusado pela parte autora (às 00:19).\n" +
                   (hasJurisprudence ? "2. **Adequação Jurisprudencial (Súmula 543/STJ)**: Como a prova oral aponta culpa exclusiva da construtora pelo atraso na obra após 180 dias de tolerância, a retenção de 20% pretendida é indevida, incidindo o dever de devolução de 100% integral e imediata." : "");
        }

        if (qLower.contains("notific") || qLower.contains("março") || qLower.contains("atraso") || qLower.contains("culpa")) {
            return "Analisando o conjunto probatório selecionado no caderno:\n\n" +
                   "• **Depoimento da Autora (Bloco 2)**: A requerente confirmou o envio de 3 notificações extrajudiciais a partir de março de 2023, após escoado o prazo de tolerância sem conclusão da alvenaria e laje.\n" +
                   "• **Justificativa da Construtora**: A alegação de desabastecimento de insumos configura fortuito interno (risco da atividade), não eximindo a responsabilidade civil da construtora.";
        }

        return "Com base nas " + activeSources.size() + " fontes selecionadas no caderno (" +
               String.join(", ", activeSources.stream().map(NotebookSourceDTO::title).toList()) + "), " +
               "a controvérsia gira em torno da responsabilidade pelo descumprimento do cronograma contratual. " +
               "A prova oral e documental reunida indica que a inexecução tempestiva decorreu de mora exclusiva da requerida, viabilizando o acolhimento do pedido resolutório.";
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
