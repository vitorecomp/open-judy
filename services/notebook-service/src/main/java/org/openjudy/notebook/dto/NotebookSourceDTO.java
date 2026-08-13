package org.openjudy.notebook.dto;

import java.time.Instant;
import java.util.UUID;

public record NotebookSourceDTO(
    UUID id,
    UUID notebookId,
    String sourceType,
    String title,
    String referenceId,
    Integer blockIndex,
    String content,
    int estimatedTokens,
    boolean isActiveForChat,
    Instant createdAt
) {}
