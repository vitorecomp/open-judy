package org.openjudy.common.enums;

/**
 * Roles of participants in court hearings (Papéis Processuais).
 */
public enum ParticipantRole {
    MAGISTRADO("Magistrado / Juiz de Direito"),
    PROMOTOR("Ministério Público / Promotor de Justiça"),
    DEFENSOR_PUBLICO("Defensoria Pública"),
    ADVOGADO_AUTOR("Advogado do Autor"),
    ADVOGADO_REU("Advogado do Réu"),
    AUTOR("Parte Autora / Requerente"),
    REU("Parte Ré / Requerido / Acusado"),
    TESTEMUNHA("Testemunha"),
    PERITO("Perito Judicial / Assistente Técnico"),
    ESCRIVAO("Escrivão / Secretário de Audiência"),
    OUTRO("Outro Participante");

    private final String description;

    ParticipantRole(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}
