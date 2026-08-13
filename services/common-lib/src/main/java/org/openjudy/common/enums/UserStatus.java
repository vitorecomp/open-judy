package org.openjudy.common.enums;

/**
 * Status lifecycle of user accounts in Open Judy.
 */
public enum UserStatus {
    ACTIVE("Ativo"),
    INACTIVE("Inativo"),
    SUSPENDED("Suspenso"),
    PENDING_APPROVAL("Pendente de Aprovação");

    private final String description;

    UserStatus(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}
