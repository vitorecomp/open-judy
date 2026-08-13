package org.openjudy.notebook.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record NotebookDTO(
    UUID id,
    String title,
    String description,
    UUID userId,
    UUID caseId,
    String caseNumber,
    String emoji,
    String color,
    List<NotebookSourceDTO> sources,
    List<NotebookNoteDTO> notes,
    int totalActiveTokens,
    Instant createdAt,
    Instant updatedAt
) {}
