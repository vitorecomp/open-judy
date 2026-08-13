package org.openjudy.common.enums;

/**
 * Lifecycle status of audio/video processing and AI analysis.
 */
public enum AudioProcessingStatus {
    PENDING("Pendente"),
    UPLOADED("Áudio Carregado"),
    PROCESSING_TRANSCRIPTION("Transcrevendo Áudio (Gemini)"),
    TRANSCRIPTION_COMPLETED("Transcrição Concluída"),
    GENERATING_ANALYSIS("Gerando Ata e Análises"),
    READY("Pronto para Revisão"),
    FAILED("Falha no Processamento");

    private final String description;

    AudioProcessingStatus(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}
