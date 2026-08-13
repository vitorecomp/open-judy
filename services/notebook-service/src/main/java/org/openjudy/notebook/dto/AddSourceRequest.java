package org.openjudy.notebook.dto;

public record AddSourceRequest(
    String sourceType,
    String title,
    String referenceId,
    Integer blockIndex,
    String content,
    Integer estimatedTokens,
    Boolean isActiveForChat
) {}
