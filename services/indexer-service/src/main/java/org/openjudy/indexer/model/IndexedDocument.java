package org.openjudy.indexer.model;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.Instant;
import java.util.List;
import java.util.Map;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class IndexedDocument {

    public enum EntityType {
        CASE,
        CASE_DOCUMENT,
        HEARING_TRANSCRIPT,
        HEARING_CHAT,
        ATA_DRAFT,
        LEGAL_ANALYSIS,
        AGENT_KNOWLEDGE,
        AGENT_CONVERSATION,
        NOTEBOOK_CONVERSATION
    }

    private String id;
    private EntityType entityType;
    private String title;
    private String caseNumber;
    private String courtJurisdiction;
    private String legalBranch;
    private String content;
    private String speakerName;
    private List<String> tags;
    private String targetUrl;
    private Map<String, Object> metadata;
    private Instant indexedAt;

    public IndexedDocument() {
        this.indexedAt = Instant.now();
    }

    public IndexedDocument(String id, EntityType entityType, String title, String caseNumber, String courtJurisdiction, String content, String targetUrl) {
        this();
        this.id = id;
        this.entityType = entityType;
        this.title = title;
        this.caseNumber = caseNumber;
        this.courtJurisdiction = courtJurisdiction;
        this.content = content;
        this.targetUrl = targetUrl;
    }

    // Getters and Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public EntityType getEntityType() { return entityType; }
    public void setEntityType(EntityType entityType) { this.entityType = entityType; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getCaseNumber() { return caseNumber; }
    public void setCaseNumber(String caseNumber) { this.caseNumber = caseNumber; }

    public String getCourtJurisdiction() { return courtJurisdiction; }
    public void setCourtJurisdiction(String courtJurisdiction) { this.courtJurisdiction = courtJurisdiction; }

    public String getLegalBranch() { return legalBranch; }
    public void setLegalBranch(String legalBranch) { this.legalBranch = legalBranch; }

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }

    public String getSpeakerName() { return speakerName; }
    public void setSpeakerName(String speakerName) { this.speakerName = speakerName; }

    public List<String> getTags() { return tags; }
    public void setTags(List<String> tags) { this.tags = tags; }

    public String getTargetUrl() { return targetUrl; }
    public void setTargetUrl(String targetUrl) { this.targetUrl = targetUrl; }

    public Map<String, Object> getMetadata() { return metadata; }
    public void setMetadata(Map<String, Object> metadata) { this.metadata = metadata; }

    public Instant getIndexedAt() { return indexedAt; }
    public void setIndexedAt(Instant indexedAt) { this.indexedAt = indexedAt; }
}
