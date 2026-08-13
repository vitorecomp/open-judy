package org.openjudy.common.enums;

public enum NotificationPriority {
    LOW("Baixa"),
    NORMAL("Normal"),
    HIGH("Alta"),
    CRITICAL("Crítica");

    private final String description;

    NotificationPriority(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}
