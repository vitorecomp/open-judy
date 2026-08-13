package org.openjudy.indexer.service;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.annotation.PostConstruct;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.openjudy.indexer.model.IndexedDocument;
import org.openjudy.indexer.model.SearchResponse;
import org.openjudy.indexer.model.SearchResultItem;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@ApplicationScoped
public class ElasticsearchIndexerService {

    @ConfigProperty(name = "quarkus.elasticsearch.hosts", defaultValue = "localhost:9200")
    String esHosts;

    private final Map<String, IndexedDocument> inMemoryIndex = new ConcurrentHashMap<>();

    @PostConstruct
    void initSampleIndex() {
        // 1. Processos (Cases)
        indexDocument(new IndexedDocument(
                "case-0014238",
                IndexedDocument.EntityType.CASE,
                "Processo 0014238-89.2024.8.26.0100 - Indenização por Danos Morais e Rescisão Contratual",
                "0014238-89.2024.8.26.0100",
                "2ª Vara Cível da Comarca de São Paulo",
                "Ação ordinária de rescisão de compromisso de compra e venda de imóvel cumulada com restituição de quantias pagas e indenização por danos morais. Autor: Carlos Eduardo Mendes. Réu: Construtora Metrópole S.A. Juíza: Dra. Camila Vasconcelos. Tema controvertido: atraso na entrega da obra além do prazo de tolerância de 180 dias.",
                "/cases/f1e2d3c4-b5a6-9788-7654-3210fedcba98"
        ));

        indexDocument(new IndexedDocument(
                "case-0004521",
                IndexedDocument.EntityType.CASE,
                "Processo 0004521-12.2024.5.02.0001 - Horas Extras e Rescisão Indireta",
                "0004521-12.2024.5.02.0001",
                "1ª Vara do Trabalho da Zona Sul",
                "Reclamação trabalhista versando sobre equiparação salarial, horas extraordinárias decorrentes de intervalo intrajornada suprimido e rescisão indireta. Autora: Juliana Almeida Prado. Réu: Banco Continental S.A. Juiz: Dr. Alexandre Martins.",
                "/cases/case-0004521"
        ));

        // 2. Peças Processuais (Documents)
        indexDocument(new IndexedDocument(
                "doc-peticao-0014238",
                IndexedDocument.EntityType.CASE_DOCUMENT,
                "Petição Inicial com Pedido Liminar de Urgência",
                "0014238-89.2024.8.26.0100",
                "2ª Vara Cível de São Paulo",
                "O autor adquiriu unidade imobiliária com prazo de conclusão em março de 2023. Notificada a construtora sobre a paralisação do canteiro de obras, esta recusou a devolução integral dos valores, exigindo retenção de 40%. Requer tutela de urgência e aplicação da Súmula 543 do STJ.",
                "/cases/f1e2d3c4-b5a6-9788-7654-3210fedcba98"
        ));

        indexDocument(new IndexedDocument(
                "doc-laudo-0014238",
                IndexedDocument.EntityType.CASE_DOCUMENT,
                "Laudo Pericial de Engenharia Civil e Cronograma de Obras",
                "0014238-89.2024.8.26.0100",
                "2ª Vara Cível de São Paulo",
                "Perícia técnica de engenharia constatou atraso de 14 meses no cronograma executivo das fundações e estrutura. O perito judicial Eng. Marcelo Rossi concluiu que as alegações de escassez de cimento não caracterizam fortuito externo ou força maior aptos a elidir a mora contratual.",
                "/cases/f1e2d3c4-b5a6-9788-7654-3210fedcba98"
        ));

        // 3. Transcrições Diarizadas de Audiências (Transcripts)
        IndexedDocument t1 = new IndexedDocument(
                "trans-seg-01",
                IndexedDocument.EntityType.HEARING_TRANSCRIPT,
                "Depoimento Autoral - Mariana Ribeiro Silva (00:49)",
                "0014238-89.2024.8.26.0100",
                "2ª Vara Cível de São Paulo",
                "Mariana Ribeiro Silva: 'Enviei três notificações extrajudiciais e a ré informou que houve falta de insumos, mas se recusou a rescindir amigavelmente sem reter quarenta por cento do valor pago.'",
                "/hearings/f1e2d3c4-b5a6-9788-7654-3210fedcba98"
        );
        t1.setSpeakerName("Mariana Ribeiro Silva (Autora)");
        indexDocument(t1);

        IndexedDocument t2 = new IndexedDocument(
                "trans-seg-02",
                IndexedDocument.EntityType.HEARING_TRANSCRIPT,
                "Manifestação do Juízo - Dra. Camila Vasconcelos (01:56)",
                "0014238-89.2024.8.26.0100",
                "2ª Vara Cível de São Paulo",
                "Dra. Camila Vasconcelos: 'Declaro encerrada a instrução probatória oral. Concedo o prazo sucessivo de 15 dias úteis para apresentação de memoriais pelas partes.'",
                "/hearings/f1e2d3c4-b5a6-9788-7654-3210fedcba98"
        );
        t2.setSpeakerName("Dra. Camila Vasconcelos (Juíza de Direito)");
        indexDocument(t2);

        // 4. Análises Jurídicas & Contradições (Legal Analysis)
        indexDocument(new IndexedDocument(
                "analysis-contra-01",
                IndexedDocument.EntityType.LEGAL_ANALYSIS,
                "Análise de Contradição Fática - Culpa Contratual e Distrato",
                "0014238-89.2024.8.26.0100",
                "2ª Vara Cível de São Paulo",
                "Identificada contradição probatória entre o preposto da construtora e a prova pericial quanto aos motivos da paralisação da obra. Incidência da tese vinculante do STJ (Súmula 543): resolução por culpa do promitente vendedor impõe devolução imediata e integral.",
                "/hearings/f1e2d3c4-b5a6-9788-7654-3210fedcba98"
        ));

        // 5. Agentes Gemini Enterprise (Agent Garden)
        indexDocument(new IndexedDocument(
                "agent-juris-01",
                IndexedDocument.EntityType.AGENT_KNOWLEDGE,
                "Agente de Pesquisa Jurisprudencial & Súmulas Vinculantes",
                "N/A",
                "Tribunal de Justiça & Tribunais Superiores",
                "Agente corporativo do Gemini Enterprise conectado ao Discovery Engine StreamAssist. Especialista em Teses de Repercussão Geral do STF, Recursos Repetitivos do STJ, Súmulas Vinculantes e Jurisprudência dos Tribunais Regionais.",
                "/agents/agent-juris-01"
        ));

        // 6. Conversas nos Cadernos de Pesquisa Jurídica (Notebook Conversations)
        indexDocument(new IndexedDocument(
                "chat-notebook-0014238",
                IndexedDocument.EntityType.NOTEBOOK_CONVERSATION,
                "Caderno: Análise de Teses sobre Súmula 543 STJ e Rescisão Culposa",
                "0014238-89.2024.8.26.0100",
                "2ª Vara Cível da Comarca de São Paulo",
                "Conversa do Caderno: Juíza consultou aplicabilidade da Súmula 543 do STJ quando comprovada a mora da construtora. Síntese dos argumentos: restou demonstrado que a rescisão ocorreu por culpa exclusiva da promitente vendedora (atraso de 14 meses), sendo nula a pretensão de reter 40%.",
                "/notebooks/f1e2d3c4-b5a6-9788-7654-3210fedcba98"
        ));

        indexDocument(new IndexedDocument(
                "chat-notebook-0004521",
                IndexedDocument.EntityType.NOTEBOOK_CONVERSATION,
                "Caderno: Confronto de Horas Extras e Súmula 338 do TST",
                "0004521-12.2024.5.02.0001",
                "1ª Vara do Trabalho da Zona Sul",
                "Conversa do Caderno: Debate sobre cartões de ponto com horários invariáveis (britânicos) e inversão do ônus da prova conforme Súmula 338, III, do TST. Discussão de cálculo de reflexos em descanso semanal remunerado e verbas rescisórias.",
                "/notebooks/nb-0004521"
        ));

        // 7. Conversas no Gemini Chat da Audiência (Audiência Conversations)
        indexDocument(new IndexedDocument(
                "chat-hearing-0014238",
                IndexedDocument.EntityType.HEARING_CHAT,
                "Chat da Audiência: Pergunta sobre Notificações e Paralisação das Obras",
                "0014238-89.2024.8.26.0100",
                "2ª Vara Cível da Comarca de São Paulo",
                "Gemini Chat da Audiência: 'Pergunta: A autora comprovou ter notificado a construtora antes de ajuizar a ação? Resposta do Gemini Chat: Sim, aos 00:49 a autora Mariana declarou que enviou 3 notificações extrajudiciais comprovando a recusa da ré em rescindir amigavelmente.'",
                "/hearings/f1e2d3c4-b5a6-9788-7654-3210fedcba98"
        ));

        indexDocument(new IndexedDocument(
                "chat-hearing-0004521",
                IndexedDocument.EntityType.HEARING_CHAT,
                "Chat da Audiência: Pergunta sobre Confissão do Preposto em Horas Extras",
                "0004521-12.2024.5.02.0001",
                "1ª Vara do Trabalho da Zona Sul",
                "Gemini Chat da Audiência: 'Pergunta: O preposto confirmou a jornada além das 18h? Resposta do Gemini Chat: O preposto admitiu que no período de fechamento mensal havia prorrogação de jornada sem registro nos espelhos de ponto.'",
                "/hearings/case-0004521"
        ));

        // 8. Conversas do Gemini Enterprise (Agent Garden Multi-turn Sessions)
        indexDocument(new IndexedDocument(
                "chat-enterprise-agent-juris",
                IndexedDocument.EntityType.AGENT_CONVERSATION,
                "Conversa com Agente: Jurisprudência sobre Rescisão Imobiliária e Lucros Cessantes",
                "0014238-89.2024.8.26.0100",
                "Tribunal de Justiça & Tribunais Superiores",
                "Sessão StreamAssist Gemini Enterprise: Consulta sobre cumulação de lucros cessantes com cláusula penal moratória (Tema 970 e Tema 971 do STJ). Agente retornou 3 acórdãos paradigmas com citação direta do acervo jurisprudencial.",
                "/agents/agent-juris-01"
        ));

        indexDocument(new IndexedDocument(
                "chat-enterprise-agent-contra",
                IndexedDocument.EntityType.AGENT_CONVERSATION,
                "Conversa com Agente: Auditoria de Contradições Periciais",
                "0014238-89.2024.8.26.0100",
                "2ª Vara Cível da Comarca de São Paulo",
                "Sessão StreamAssist Gemini Enterprise: Auditor de Contradições cruzou o depoimento da testemunha da ré com a conclusão do laudo pericial (folha 142), apontando incongruência de 8 meses na data alegada para retomada do empreendimento.",
                "/agents/agent-contra-02"
        ));
    }

    public IndexedDocument indexDocument(IndexedDocument doc) {
        if (doc.getId() == null) {
            doc.setId(UUID.randomUUID().toString());
        }
        doc.setIndexedAt(Instant.now());
        inMemoryIndex.put(doc.getId(), doc);
        return doc;
    }

    public boolean deleteDocument(String id) {
        return inMemoryIndex.remove(id) != null;
    }

    public SearchResponse search(String query, String entityTypeFilter, int limit) {
        long startTime = System.currentTimeMillis();
        final String q = (query != null) ? query.trim() : "";
        final String[] terms = q.toLowerCase().split("\\s+");

        List<SearchResultItem> matches = new ArrayList<>();
        Map<String, Long> facets = new HashMap<>();

        for (IndexedDocument doc : inMemoryIndex.values()) {
            // Apply entityType filter if provided
            if (entityTypeFilter != null && !entityTypeFilter.isBlank() && !entityTypeFilter.equalsIgnoreCase("ALL")) {
                if (!doc.getEntityType().name().equalsIgnoreCase(entityTypeFilter)) {
                    continue;
                }
            }

            // Calculate relevance score & match
            double score = calculateRelevanceScore(doc, terms);
            if (score > 0 || q.isEmpty()) {
                String highlight = generateHighlightSnippet(doc.getContent(), terms);
                SearchResultItem item = new SearchResultItem(
                        doc.getId(),
                        doc.getEntityType().name(),
                        doc.getTitle(),
                        doc.getCaseNumber(),
                        doc.getCourtJurisdiction(),
                        highlight,
                        score,
                        doc.getTargetUrl()
                );
                item.setSpeakerName(doc.getSpeakerName());
                item.setIndexedAt(doc.getIndexedAt());
                matches.add(item);

                // Update facet counts
                facets.merge(doc.getEntityType().name(), 1L, Long::sum);
            }
        }

        // Sort by score descending
        matches.sort((a, b) -> Double.compare(b.getScore(), a.getScore()));

        List<SearchResultItem> paginated = matches.stream().limit(limit > 0 ? limit : 20).collect(Collectors.toList());
        long took = System.currentTimeMillis() - startTime;

        return new SearchResponse(q, matches.size(), took, paginated, facets);
    }

    private double calculateRelevanceScore(IndexedDocument doc, String[] terms) {
        if (terms.length == 0 || terms[0].isEmpty()) return 1.0;

        double score = 0.0;
        String titleLower = (doc.getTitle() != null) ? doc.getTitle().toLowerCase() : "";
        String caseNumLower = (doc.getCaseNumber() != null) ? doc.getCaseNumber().toLowerCase() : "";
        String contentLower = (doc.getContent() != null) ? doc.getContent().toLowerCase() : "";
        String speakerLower = (doc.getSpeakerName() != null) ? doc.getSpeakerName().toLowerCase() : "";

        for (String term : terms) {
            if (term.isBlank()) continue;
            if (caseNumLower.contains(term)) score += 10.0;
            if (titleLower.contains(term)) score += 5.0;
            if (speakerLower.contains(term)) score += 4.0;
            if (contentLower.contains(term)) score += 2.0;
        }

        return score;
    }

    private String generateHighlightSnippet(String content, String[] terms) {
        if (content == null || content.isBlank()) return "";
        if (terms.length == 0 || terms[0].isEmpty()) {
            return content.length() > 200 ? content.substring(0, 200) + "..." : content;
        }

        // Find earliest matching term
        int bestIdx = -1;
        String contentLower = content.toLowerCase();
        for (String term : terms) {
            if (term.isBlank()) continue;
            int idx = contentLower.indexOf(term);
            if (idx != -1 && (bestIdx == -1 || idx < bestIdx)) {
                bestIdx = idx;
            }
        }

        int start = Math.max(0, bestIdx - 60);
        int end = Math.min(content.length(), bestIdx + 140);
        String snippet = content.substring(start, end);
        if (start > 0) snippet = "..." + snippet;
        if (end < content.length()) snippet = snippet + "...";

        // Wrap matched terms with mark tag
        for (String term : terms) {
            if (term.isBlank() || term.length() < 2) continue;
            snippet = Pattern.compile("(?i)(" + Pattern.quote(term) + ")")
                    .matcher(snippet)
                    .replaceAll("<mark class=\"bg-crimson/30 text-white font-bold px-0.5 rounded\">$1</mark>");
        }

        return snippet;
    }

    public Map<String, Object> getStatus() {
        return Map.of(
                "service", "indexer-service",
                "status", "HEALTHY",
                "elasticsearchHosts", esHosts,
                "totalIndexedDocuments", inMemoryIndex.size(),
                "indexName", "open_judy_unified_index"
        );
    }
}
