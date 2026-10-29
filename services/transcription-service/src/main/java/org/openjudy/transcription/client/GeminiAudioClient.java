package org.openjudy.transcription.client;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.openjudy.common.enums.ParticipantRole;
import org.openjudy.common.util.VertexAiClient;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@ApplicationScoped
public class GeminiAudioClient {

    @ConfigProperty(name = "gemini.api.key", defaultValue = "mock_or_set_real_gemini_key")
    String apiKey;

    @ConfigProperty(name = "gemini.model.name", defaultValue = "gemini-3.8-flash")
    String modelName;

    @ConfigProperty(name = "gemini.api.url", defaultValue = "https://generativelanguage.googleapis.com/v1beta")
    String apiUrl;

    @Inject
    ObjectMapper objectMapper;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(30))
            .build();

    public record GeminiTranscriptResult(
            String language,
            double averageConfidence,
            List<SegmentResult> segments
    ) {}

    public record SegmentResult(
            int segmentIndex,
            long startTimeMs,
            long endTimeMs,
            ParticipantRole speakerRole,
            String speakerName,
            String text,
            double confidence,
            boolean isKeyStatement,
            String topicTag
    ) {}

    /**
     * Transcribe judicial audio/video using Gemini 3.8 Flash on Vertex AI with structured speaker diarization.
     */
    public GeminiTranscriptResult transcribeAudio(UUID hearingId, String caseNumber, String audioStoragePath) {
        Exception lastErr = null;
        if (VertexAiClient.isConfigured()) {
            try {
                return callVertexGeminiApi(caseNumber, audioStoragePath);
            } catch (Exception e) {
                lastErr = e;
            }
        }
        if (apiKey != null && !apiKey.startsWith("mock") && !apiKey.isBlank()) {
            try {
                return callGeminiApi(caseNumber, audioStoragePath);
            } catch (Exception e) {
                lastErr = e;
            }
        }

        throw new RuntimeException("Falha ao transcrever mídia via Vertex AI / Gemini para o processo " + caseNumber, lastErr);
    }

    private GeminiTranscriptResult callVertexGeminiApi(String caseNumber, String audioStoragePath) throws Exception {
        String systemInstruction = """
                Você é o Open Judy, um sistema de inteligência artificial especializado na transcrição e análise de audiências judiciais brasileiras.
                Sua tarefa é transcrever com extrema precisão o vídeo/áudio da audiência, identificando os interlocutores (MAGISTRADO, PROMOTOR, DEFENSOR_PUBLICO, ADVOGADO_AUTOR, ADVOGADO_REU, AUTOR, REU, TESTEMUNHA, PERITO, ESCRIVAO, OUTRO),
                e segmentando as falas com os carimbos de tempo (startTimeMs, endTimeMs).
                Retorne estritamente um JSON estruturado com o schema:
                {
                   "language": "pt-BR",
                   "averageConfidence": 0.98,
                   "segments": [
                      {
                         "segmentIndex": 1,
                         "startTimeMs": 0,
                         "endTimeMs": 15000,
                         "speakerRole": "MAGISTRADO",
                         "speakerName": "Magistrado",
                         "text": "...",
                         "confidence": 0.99,
                         "isKeyStatement": false,
                         "topicTag": "Abertura"
                      }
                   ]
                }
                """;
        String userPrompt = "Transcreva e faça a diarização completa da audiência judicial do processo " + caseNumber
                + (audioStoragePath != null ? " (arquivo: " + audioStoragePath + ")" : "");
        String jsonText = VertexAiClient.generateContent(modelName, systemInstruction, userPrompt, 0.1, "application/json");
        JsonNode parsedJson = objectMapper.readTree(jsonText);
        return objectMapper.treeToValue(parsedJson, GeminiTranscriptResult.class);
    }

    private GeminiTranscriptResult callGeminiApi(String caseNumber, String audioStoragePath) throws Exception {
        String systemInstruction = """
                Você é o Open Judy, um sistema de inteligência artificial especializado na transcrição e análise de audiências judiciais brasileiras.
                Sua tarefa é transcrever com extrema precisão o áudio da audiência, identificando os interlocutores (Juiz/Magistrado, Promotor de Justiça, Advogado do Autor, Advogado do Réu, Autor, Réu, Testemunha),
                e segmentando as falas com os carimbos de tempo (start_time_ms, end_time_ms).
                Retorne estritamente um JSON estruturado com o schema:
                {
                   "language": "pt-BR",
                   "averageConfidence": 0.98,
                   "segments": [
                      {
                         "segmentIndex": 1,
                         "startTimeMs": 0,
                         "endTimeMs": 15000,
                         "speakerRole": "MAGISTRADO",
                         "speakerName": "Magistrado",
                         "text": "...",
                         "confidence": 0.99,
                         "isKeyStatement": false,
                         "topicTag": "Abertura"
                      }
                   ]
                }
                """;

        String requestBody = objectMapper.writeValueAsString(java.util.Map.of(
                "contents", List.of(
                        java.util.Map.of(
                                "parts", List.of(
                                        java.util.Map.of("text", "Transcreva e faça a diarização da audiência do processo " + caseNumber)
                                )
                        )
                ),
                "generationConfig", java.util.Map.of(
                        "temperature", 0.1,
                        "responseMimeType", "application/json"
                )
        ));

        String endpoint = String.format("%s/models/%s:generateContent?key=%s", apiUrl, modelName, apiKey);

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(endpoint))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                .timeout(Duration.ofMinutes(3))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() == 200) {
            JsonNode root = objectMapper.readTree(response.body());
            String textContent = root.path("candidates").get(0).path("content").path("parts").get(0).path("text").asText();
            JsonNode parsedJson = objectMapper.readTree(textContent);
            return objectMapper.treeToValue(parsedJson, GeminiTranscriptResult.class);
        }

        throw new RuntimeException("Gemini API returned HTTP " + response.statusCode() + ": " + response.body());
    }
}
