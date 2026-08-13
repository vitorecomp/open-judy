package org.openjudy.agentgarden.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.time.Instant;
import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class StreamAssistChunk {

    public enum EventType {
        PLANNER_STEP,
        GROUNDED_CHUNK,
        CITATION,
        COMPLETE,
        ERROR
    }

    private EventType eventType;
    private String text;
    private String plannerStep;
    private String planStepId;
    private String sessionId;
    private String agentId;
    private List<Citation> citations;
    private Instant timestamp;

    public StreamAssistChunk() {
        this.timestamp = Instant.now();
    }

    public StreamAssistChunk(EventType eventType, String text) {
        this();
        this.eventType = eventType;
        this.text = text;
    }

    public static StreamAssistChunk plannerStep(String stepDescription, String planStepId) {
        StreamAssistChunk chunk = new StreamAssistChunk(EventType.PLANNER_STEP, null);
        chunk.setPlannerStep(stepDescription);
        chunk.setPlanStepId(planStepId);
        return chunk;
    }

    public static StreamAssistChunk groundedChunk(String text, String sessionId) {
        StreamAssistChunk chunk = new StreamAssistChunk(EventType.GROUNDED_CHUNK, text);
        chunk.setSessionId(sessionId);
        return chunk;
    }

    public static StreamAssistChunk citationEvent(List<Citation> citations) {
        StreamAssistChunk chunk = new StreamAssistChunk(EventType.CITATION, null);
        chunk.setCitations(citations);
        return chunk;
    }

    public static StreamAssistChunk complete(String sessionId) {
        StreamAssistChunk chunk = new StreamAssistChunk(EventType.COMPLETE, null);
        chunk.setSessionId(sessionId);
        return chunk;
    }

    public static StreamAssistChunk error(String errorMessage) {
        StreamAssistChunk chunk = new StreamAssistChunk(EventType.ERROR, errorMessage);
        return chunk;
    }

    // Getters and Setters
    public EventType getEventType() { return eventType; }
    public void setEventType(EventType eventType) { this.eventType = eventType; }

    public String getText() { return text; }
    public void setText(String text) { this.text = text; }

    public String getPlannerStep() { return plannerStep; }
    public void setPlannerStep(String plannerStep) { this.plannerStep = plannerStep; }

    public String getPlanStepId() { return planStepId; }
    public void setPlanStepId(String planStepId) { this.planStepId = planStepId; }

    public String getSessionId() { return sessionId; }
    public void setSessionId(String sessionId) { this.sessionId = sessionId; }

    public String getAgentId() { return agentId; }
    public void setAgentId(String agentId) { this.agentId = agentId; }

    public List<Citation> getCitations() { return citations; }
    public void setCitations(List<Citation> citations) { this.citations = citations; }

    public Instant getTimestamp() { return timestamp; }
    public void setTimestamp(Instant timestamp) { this.timestamp = timestamp; }
}
