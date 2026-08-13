package org.openjudy.agentgarden.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class SessionInfo {

    private String sessionId;
    private String gcpSessionPath;
    private String agentId;
    private String hearingId;
    private String title;
    private int turnCount;
    private Instant createdAt;
    private Instant lastActiveAt;
    private List<String> queryHistory;

    public SessionInfo() {
        this.createdAt = Instant.now();
        this.lastActiveAt = Instant.now();
        this.queryHistory = new ArrayList<>();
    }

    public SessionInfo(String sessionId, String gcpSessionPath, String agentId, String title) {
        this();
        this.sessionId = sessionId;
        this.gcpSessionPath = gcpSessionPath;
        this.agentId = agentId;
        this.title = title;
    }

    public String getSessionId() { return sessionId; }
    public void setSessionId(String sessionId) { this.sessionId = sessionId; }

    public String getGcpSessionPath() { return gcpSessionPath; }
    public void setGcpSessionPath(String gcpSessionPath) { this.gcpSessionPath = gcpSessionPath; }

    public String getAgentId() { return agentId; }
    public void setAgentId(String agentId) { this.agentId = agentId; }

    public String getHearingId() { return hearingId; }
    public void setHearingId(String hearingId) { this.hearingId = hearingId; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public int getTurnCount() { return turnCount; }
    public void setTurnCount(int turnCount) { this.turnCount = turnCount; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public Instant getLastActiveAt() { return lastActiveAt; }
    public void setLastActiveAt(Instant lastActiveAt) { this.lastActiveAt = lastActiveAt; }

    public List<String> getQueryHistory() { return queryHistory; }
    public void setQueryHistory(List<String> queryHistory) { this.queryHistory = queryHistory; }
}
