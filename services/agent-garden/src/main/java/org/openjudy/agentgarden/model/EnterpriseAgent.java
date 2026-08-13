package org.openjudy.agentgarden.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.time.Instant;
import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class EnterpriseAgent {

    private String id;
    private String code;
    private String name;
    private String description;
    private String category; // e.g. "JURISPRUDENCE", "LEGAL_RESEARCH", "ATA_DRAFTING", "CONTRADICTION_AUDIT", "SENTENCE_ANALYSIS"
    private String icon;
    private String agentType; // "GEMINI_ENTERPRISE_USER_AGENT", "A2A", "ADK", "DIALOGFLOW_CX", "MCP_SERVER"
    private List<String> capabilities;
    private List<String> dataStores;
    private String systemInstruction;
    private String defaultModel;
    private String status; // "ACTIVE", "INACTIVE", "DEPRECATED"
    private boolean isDefault;
    private Instant createdAt;

    public EnterpriseAgent() {
        this.createdAt = Instant.now();
        this.status = "ACTIVE";
    }

    public EnterpriseAgent(String id, String code, String name, String description, String category, String icon, String agentType, List<String> capabilities, List<String> dataStores, String defaultModel, boolean isDefault) {
        this();
        this.id = id;
        this.code = code;
        this.name = name;
        this.description = description;
        this.category = category;
        this.icon = icon;
        this.agentType = agentType;
        this.capabilities = capabilities;
        this.dataStores = dataStores;
        this.defaultModel = defaultModel;
        this.isDefault = isDefault;
    }

    // Getters and Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getIcon() { return icon; }
    public void setIcon(String icon) { this.icon = icon; }

    public String getAgentType() { return agentType; }
    public void setAgentType(String agentType) { this.agentType = agentType; }

    public List<String> getCapabilities() { return capabilities; }
    public void setCapabilities(List<String> capabilities) { this.capabilities = capabilities; }

    public List<String> getDataStores() { return dataStores; }
    public void setDataStores(List<String> dataStores) { this.dataStores = dataStores; }

    public String getSystemInstruction() { return systemInstruction; }
    public void setSystemInstruction(String systemInstruction) { this.systemInstruction = systemInstruction; }

    public String getDefaultModel() { return defaultModel; }
    public void setDefaultModel(String defaultModel) { this.defaultModel = defaultModel; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public boolean isDefault() { return isDefault; }
    public void setDefault(boolean aDefault) { isDefault = aDefault; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
