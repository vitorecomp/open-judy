package org.openjudy.common.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Official minutes of the hearing (Minuta da Ata de Audiência).
 */
public record AtaDraftDTO(
    UUID id,
    UUID hearingId,
    String title,
    String judicialHeader,       // Cabeçalho institucional / Vara
    String caseIdentification,    // Identificação dos autos
    String presenceList,          // Lista de presenças e ausências
    String testimonySummary,      // Síntese dos depoimentos colhidos
    String proceduralDecisions,   // Deliberações e Decisões Interlocutórias
    String finalOrder,            // Despacho final / Encerramento / Próximos atos
    String fullFormattedText,     // Texto consolidado completo em Markdown / HTML
    boolean isApprovedByJudge,
    String judgeSignature,
    Instant generatedAt,
    Instant updatedAt
) {}
