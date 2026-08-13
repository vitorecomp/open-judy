package org.openjudy.indexer.model;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.Instant;
import java.util.Map;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class SearchResultItem {

    private String id;
    private String entityType;
    private String title;
    private String caseNumber;
    private String courtJurisdiction;
    private String highlightSnippet;
    private Double score;
    private String targetUrl;
    private String speakerName;
    private Map<String, Object> metadata;
    private Instant indexedAt;

    public SearchResultItem() {
        this.indexedAt = Instant.now();
    }

    public SearchResultItem(String id, String entityType, String title, String caseNumber, String courtJurisdiction, String highlightSnippet, Double score, String targetUrl) {
        this();
        this.id = id;
        this.entityType = entityType;
        this.title = title;
        this.caseNumber = caseNumber;
        this.courtJurisdiction = courtJurisdiction;
        this.highlightSnippet = highlightSnippet;
        this.score = score;
        this.targetUrl = targetUrl;
    }

    // Getters and Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getEntityType() { return entityType; }
    public void setEntityType(String entityType) { this.entityType = entityType; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getCaseNumber() { return caseNumber; }
    public void setCaseNumber(String caseNumber) { this.caseNumber = caseNumber; }

    public String getCourtJurisdiction() { return courtJurisdiction; }
    public void setCourtJurisdiction(String courtJurisdiction) { this.courtJurisdiction = courtJurisdiction; }

    public String getHighlightSnippet() { return highlightSnippet; }
    public void setHighlightSnippet(String highlightSnippet) { this.highlightSnippet = highlightSnippet; }

    public Double getScore() { return score; }
    public void setScore(Double score) { this.score = score; }

    public String getTargetUrl() { return targetUrl; }
    public void setTargetUrl(String targetUrl) { this.targetUrl = targetUrl; }

    public String getSpeakerName() { return speakerName; }
    public void setSpeakerName(String speakerName) { this.speakerName = speakerName; }

    public Map<String, Object> getMetadata() { return metadata; }
    public void setMetadata(Map<String, Object> metadata) { this.metadata = metadata; }

    public Instant getIndexedAt() { return indexedAt; }
    public void setIndexedAt(Instant indexedAt) { this.indexedAt = indexedAt; }
}
