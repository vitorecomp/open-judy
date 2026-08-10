package org.openjudy.common.enums;

public enum NotificationCategory {
    AUDIO_PROCESSING("Processamento e Transcrição de Áudio"),
    LEGAL_ANALYSIS("Análise Jurídica e Detector de Contradições"),
    DOCUMENT_WORKFLOW("Fluxo de Atas, Minutas e Assinaturas"),
    SECURITY_AUDIT("Segurança, Acessos e Auditoria"),
    SYSTEM("Alertas de Plataforma e Manutenção");

    private final String description;

    NotificationCategory(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}
