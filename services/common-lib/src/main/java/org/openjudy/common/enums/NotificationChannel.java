package org.openjudy.common.enums;

public enum NotificationChannel {
    IN_APP("Notificação em Tela / Web"),
    EMAIL("Correio Eletrônico"),
    WEBSOCKET("Push em Tempo Real"),
    WEBHOOK("Webhook Externo");

    private final String description;

    NotificationChannel(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}
