package org.openjudy.common.enums;

public enum AiModelProvider {
    GOOGLE_GEMINI("Google Gemini AI"),
    VERTEX_AI("Google Cloud Vertex AI"),
    OPENAI("OpenAI"),
    ANTHROPIC("Anthropic"),
    LOCAL_OLLAMA("Local Ollama / Open Source");

    private final String displayName;

    AiModelProvider(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }
}
