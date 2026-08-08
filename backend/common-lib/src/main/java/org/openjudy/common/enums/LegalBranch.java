package org.openjudy.common.enums;

/**
 * Branches of Justice (Ramos da Justiça).
 */
public enum LegalBranch {
    ESTADUAL_CIVEL("Justiça Estadual - Cível"),
    ESTADUAL_CRIMINAL("Justiça Estadual - Criminal"),
    FEDERAL("Justiça Federal"),
    TRABALHO("Justiça do Trabalho"),
    FAMILIA("Família e Sucessões"),
    JUIZADO_ESPECIAL("Juizados Especiais"),
    MILITAR("Justiça Militar"),
    ELEITORAL("Justiça Eleitoral");

    private final String description;

    LegalBranch(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}
