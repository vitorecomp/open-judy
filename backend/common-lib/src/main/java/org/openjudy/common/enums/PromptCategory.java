package org.openjudy.common.enums;

public enum PromptCategory {
    DOCUMENT_GENERATION("Geração de Documentos e Atas"),
    LEGAL_ANALYSIS("Análise Jurídica e Contradições"),
    COPILOT("Assistente Copilot e RAG"),
    TRANSCRIPTION("Transcrição e Diarização"),
    SUMMARIZATION("Sínteses e Ementas"),
    GENERAL("Configurações Gerais de Prompt");

    private final String description;

    PromptCategory(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}
