package org.openjudy.common.enums;

/**
 * Types of Judicial Hearings (Tipos de Audiências Judiciais).
 */
public enum HearingType {
    INSTRUCAO_E_JULGAMENTO("Instrução e Julgamento"),
    CONCILIACAO("Conciliação e Mediação"),
    CUSTODIA("Custódia"),
    PRELIMINAR("Preliminar"),
    UNA("Una (Trabalhista/Juizado)"),
    INTERROGATORIO("Interrogatório"),
    OUTRO("Outro");

    private final String description;

    HearingType(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}
