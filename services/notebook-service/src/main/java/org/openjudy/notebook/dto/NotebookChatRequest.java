package org.openjudy.notebook.dto;

import java.util.List;
import java.util.UUID;

public record NotebookChatRequest(
    String question,
    List<UUID> activeSourceIds
) {}
