package org.openjudy.common.dto;

import org.openjudy.common.enums.LegalBranch;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * DTO representing a legal lawsuit / court proceeding (Processo Judicial).
 */
public record CaseDTO(
    UUID id,
    String caseNumber,          // e.g. 0001234-56.2024.8.26.0001 (CNJ standard)
    String courtJurisdiction,    // e.g. 2ª Vara Cível da Comarca de São Paulo
    LegalBranch legalBranch,
    String subject,             // e.g. Indenização por Danos Morais e Materiais
    String plaintiffName,       // Autor
    String defendantName,       // Réu
    String judgeName,           // Magistrado
    String prosecutorName,      // Promotor (if applicable)
    List<ParticipantDTO> participants,
    Instant createdAt,
    Instant updatedAt
) {}
