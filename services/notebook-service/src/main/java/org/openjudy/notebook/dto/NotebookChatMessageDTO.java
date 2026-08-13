package org.openjudy.notebook.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record NotebookChatMessageDTO(
    UUID id,
    UUID notebookId,
    String role,
    String content,
    List<String> activeSourceTitles,
    List<CitationDTO> citations,
    int tokensUsed,
    Instant createdAt
) {
    public record CitationDTO(
        String sourceTitle,
        String snippet,
        String referenceUrl
    ) {}
}
