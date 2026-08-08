package org.openjudy.common.dto;

import java.util.List;
import java.util.UUID;

/**
 * Request payload for Judicial Copilot Chat.
 */
public record CopilotChatRequest(
    UUID hearingId,
    String question,
    List<ChatMessage> conversationHistory
) {
    public record ChatMessage(
        String role, // "user" or "assistant"
        String content
    ) {}
}
