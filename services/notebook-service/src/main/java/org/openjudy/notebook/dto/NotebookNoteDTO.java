package org.openjudy.notebook.dto;

import java.time.Instant;
import java.util.UUID;

public record NotebookNoteDTO(
    UUID id,
    UUID notebookId,
    String title,
    String content,
    String noteType,
    Instant createdAt,
    Instant updatedAt
) {}
