package org.openjudy.common.dto;

import org.openjudy.common.enums.ParticipantRole;

import java.util.UUID;

/**
 * DTO representing a legal participant in a case or hearing.
 */
public record ParticipantDTO(
    UUID id,
    String name,
    ParticipantRole role,
    String documentNumber, // CPF / CNPJ / OAB
    String email,
    String notes,
    boolean isPresent
) {}
