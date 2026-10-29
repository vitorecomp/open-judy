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
        // Initialized empty; populated via /api/v1/indexer/index or scripts/populate
    }

    public void clearAll() {
        inMemoryIndex.clear();
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
