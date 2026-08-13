package org.openjudy.notebook.dto;

import java.util.UUID;

public record CreateNotebookRequest(
    String title,
    String description,
    UUID userId,
    UUID caseId,
    String caseNumber,
    String emoji,
    String color
) {}
