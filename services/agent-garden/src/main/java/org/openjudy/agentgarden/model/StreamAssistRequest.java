package org.openjudy.agentgarden.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.Map;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class StreamAssistRequest {

    private String queryText;
    private String sessionId;
    private String agentId;
    private String hearingId;
    private String caseNumber;
    private Map<String, Object> userContext;

    public StreamAssistRequest() {}

    public StreamAssistRequest(String queryText, String sessionId, String agentId) {
        this.queryText = queryText;
        this.sessionId = sessionId;
        this.agentId = agentId;
    }

    public String getQueryText() { return queryText; }
    public void setQueryText(String queryText) { this.queryText = queryText; }

    public String getSessionId() { return sessionId; }
    public void setSessionId(String sessionId) { this.sessionId = sessionId; }

    public String getAgentId() { return agentId; }
    public void setAgentId(String agentId) { this.agentId = agentId; }

    public String getHearingId() { return hearingId; }
    public void setHearingId(String hearingId) { this.hearingId = hearingId; }

    public String getCaseNumber() { return caseNumber; }
    public void setCaseNumber(String caseNumber) { this.caseNumber = caseNumber; }

    public Map<String, Object> getUserContext() { return userContext; }
    public void setUserContext(Map<String, Object> userContext) { this.userContext = userContext; }
}
