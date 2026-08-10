package org.openjudy.common.enums;

public enum AiModelType {
    LLM_MULTIMODAL("LLM Multimodal (Áudio, Vídeo, Imagem e Texto)"),
    LLM_TEXT("LLM Especializado em Texto e Raciocínio Jurídico"),
    EMBEDDING("Geração de Embeddings Vetoriais para RAG"),
    AUDIO_SPEECH("Reconhecimento e Transcrição de Fala / ASR"),
    RERANKER("Reordenamento e Validação Semântica");

    private final String description;

    AiModelType(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}
