package org.openjudy.notebook.dto;

import java.util.List;
import java.util.UUID;

public record NotebookChatResponse(
    UUID messageId,
    String answer,
    List<String> activeSourceTitles,
    List<NotebookChatMessageDTO.CitationDTO> citations,
    int estimatedTokensUsed
) {}
