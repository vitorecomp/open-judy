package org.openjudy.agentgarden.model;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class Citation {

    private String title;
    private String uri;
    private String snippet;
    private String court;
    private String precedentNumber;
    private Double confidenceScore;

    public Citation() {}

    public Citation(String title, String uri, String snippet, String court, String precedentNumber, Double confidenceScore) {
        this.title = title;
        this.uri = uri;
        this.snippet = snippet;
        this.court = court;
        this.precedentNumber = precedentNumber;
        this.confidenceScore = confidenceScore;
    }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getUri() { return uri; }
    public void setUri(String uri) { this.uri = uri; }

    public String getSnippet() { return snippet; }
    public void setSnippet(String snippet) { this.snippet = snippet; }

    public String getCourt() { return court; }
    public void setCourt(String court) { this.court = court; }

    public String getPrecedentNumber() { return precedentNumber; }
    public void setPrecedentNumber(String precedentNumber) { this.precedentNumber = precedentNumber; }

    public Double getConfidenceScore() { return confidenceScore; }
    public void setConfidenceScore(Double confidenceScore) { this.confidenceScore = confidenceScore; }
}
