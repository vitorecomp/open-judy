package org.openjudy.common.dto;

import java.util.List;
import java.util.UUID;

/**
 * Request payload for Judicial Copilot Chat.
 */
public record CopilotChatRequest(
    UUID hearingId,
    String question,
    List<ChatMessage> conversationHistory,
    List<Integer> blockIndices,
    Boolean useFullTranscript
) {
    public CopilotChatRequest(
        UUID hearingId,
        String question,
        List<ChatMessage> conversationHistory
    ) {
        this(hearingId, question, conversationHistory, List.of(), false);
    }

    public record ChatMessage(
        String role, // "user" or "assistant"
        String content
    ) {}
}
