package org.openjudy.indexer.model;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.List;
import java.util.Map;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class SearchResponse {

    private String query;
    private long totalHits;
    private long tookMs;
    private List<SearchResultItem> results;
    private Map<String, Long> facets;

    public SearchResponse() {}

    public SearchResponse(String query, long totalHits, long tookMs, List<SearchResultItem> results, Map<String, Long> facets) {
        this.query = query;
        this.totalHits = totalHits;
        this.tookMs = tookMs;
        this.results = results;
        this.facets = facets;
    }

    public String getQuery() { return query; }
    public void setQuery(String query) { this.query = query; }

    public long getTotalHits() { return totalHits; }
    public void setTotalHits(long totalHits) { this.totalHits = totalHits; }

    public long getTookMs() { return tookMs; }
    public void setTookMs(long tookMs) { this.tookMs = tookMs; }

    public List<SearchResultItem> getResults() { return results; }
    public void setResults(List<SearchResultItem> results) { this.results = results; }

    public Map<String, Long> getFacets() { return facets; }
    public void setFacets(Map<String, Long> facets) { this.facets = facets; }
}
