package org.openjudy.common.util;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.KeyFactory;
import java.security.PrivateKey;
import java.security.Signature;
import java.security.spec.PKCS8EncodedKeySpec;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Shared Vertex AI Gemini client authenticating with a Google Cloud Service Account JSON key.
 * Calls https://aiplatform.googleapis.com/v1/projects/{project}/locations/global/publishers/google/models/{model}:generateContent
 */
public final class VertexAiClient {

    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final HttpClient HTTP = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(15))
            .build();

    private static final List<String> CANDIDATE_KEY_PATHS = List.of(
            "/workspace/services/.keys/service-account.json",
            "../.keys/service-account.json",
            ".keys/service-account.json",
            "keys/service-account.json",
            "../keys/service-account.json"
    );

    private static volatile String cachedToken;
    private static volatile long tokenExpiresAtEpochSec = 0;
    private static volatile String cachedProjectId;

    private VertexAiClient() {}

    public static Path resolveKeyFile() {
        String envPath = System.getenv("GOOGLE_APPLICATION_CREDENTIALS");
        if (envPath != null && !envPath.isBlank()) {
            Path p = Path.of(envPath);
            if (Files.isRegularFile(p)) return p;
        }
        for (String candidate : CANDIDATE_KEY_PATHS) {
            Path p = Path.of(candidate);
            if (Files.isRegularFile(p)) return p;
        }
        return null;
    }

    public static boolean isConfigured() {
        return resolveKeyFile() != null;
    }

    private static synchronized String getAccessToken() throws Exception {
        long now = Instant.now().getEpochSecond();
        if (cachedToken != null && now < tokenExpiresAtEpochSec - 120) {
            return cachedToken;
        }

        Path keyPath = resolveKeyFile();
        if (keyPath == null) {
            throw new IllegalStateException("Service Account key file not found");
        }

        JsonNode sa = MAPPER.readTree(keyPath.toFile());
        cachedProjectId = sa.path("project_id").asText("study-deploys");
        String clientEmail = sa.path("client_email").asText();
        String privateKeyPem = sa.path("private_key").asText();
        String tokenUri = sa.path("token_uri").asText("https://oauth2.googleapis.com/token");

        String headerJson = MAPPER.writeValueAsString(Map.of("alg", "RS256", "typ", "JWT"));
        String claimsJson = MAPPER.writeValueAsString(Map.of(
                "iss", clientEmail,
                "scope", "https://www.googleapis.com/auth/cloud-platform",
                "aud", tokenUri,
                "iat", now,
                "exp", now + 3600
        ));

        String headerB64 = base64Url(headerJson.getBytes(StandardCharsets.UTF_8));
        String claimsB64 = base64Url(claimsJson.getBytes(StandardCharsets.UTF_8));
        String signingInput = headerB64 + "." + claimsB64;

        PrivateKey privateKey = parsePemPrivateKey(privateKeyPem);
        Signature sig = Signature.getInstance("SHA256withRSA");
        sig.initSign(privateKey);
        sig.update(signingInput.getBytes(StandardCharsets.UTF_8));
        String signatureB64 = base64Url(sig.sign());

        String jwt = signingInput + "." + signatureB64;
        String formBody = "grant_type=" + URLEncoder.encode("urn:ietf:params:oauth:grant-type:jwt-bearer", StandardCharsets.UTF_8)
                + "&assertion=" + URLEncoder.encode(jwt, StandardCharsets.UTF_8);

        HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create(tokenUri))
                .header("Content-Type", "application/x-www-form-urlencoded")
                .timeout(Duration.ofSeconds(15))
                .POST(HttpRequest.BodyPublishers.ofString(formBody))
                .build();

        HttpResponse<String> resp = HTTP.send(req, HttpResponse.BodyHandlers.ofString());
        if (resp.statusCode() != 200) {
            throw new RuntimeException("OAuth2 token exchange failed (" + resp.statusCode() + "): " + resp.body());
        }

        JsonNode tokNode = MAPPER.readTree(resp.body());
        cachedToken = tokNode.path("access_token").asText();
        tokenExpiresAtEpochSec = now + tokNode.path("expires_in").asLong(3600);
        return cachedToken;
    }

    public static String generateContent(
            String modelName,
            String systemInstruction,
            String userPrompt,
            double temperature,
            String responseMimeType
    ) throws Exception {
        String token = getAccessToken();
        String projectId = cachedProjectId != null ? cachedProjectId : "study-deploys";
        String requested = (modelName == null || modelName.isBlank()) ? "gemini-3.8-flash" : modelName.trim();
        if ("gemini-2.0-flash".equalsIgnoreCase(requested)
                || "gemini-1.5-flash".equalsIgnoreCase(requested)
                || "gemini-4-argon".equalsIgnoreCase(requested)
                || "gemini-1.5-pro".equalsIgnoreCase(requested)
                || "gemini-2.5-pro".equalsIgnoreCase(requested)) {
            requested = "gemini-3.8-flash";
        }

        List<String> candidateModels = List.of(requested, "gemini-2.5-flash", "gemini-3.8-flash");

        Map<String, Object> payload = new LinkedHashMap<>();
        if (systemInstruction != null && !systemInstruction.isBlank()) {
            payload.put("systemInstruction", Map.of(
                    "parts", List.of(Map.of("text", systemInstruction))
            ));
        }
        payload.put("contents", List.of(Map.of(
                "role", "user",
                "parts", List.of(Map.of("text", userPrompt))
        )));

        Map<String, Object> genConfig = new LinkedHashMap<>();
        genConfig.put("temperature", temperature);
        if (responseMimeType != null && !responseMimeType.isBlank()) {
            genConfig.put("responseMimeType", responseMimeType);
        }
        payload.put("generationConfig", genConfig);

        String payloadStr = MAPPER.writeValueAsString(payload);
        Exception lastErr = null;

        for (int attempt = 0; attempt < candidateModels.size(); attempt++) {
            String activeModel = candidateModels.get(attempt);
            String url = String.format(
                    "https://aiplatform.googleapis.com/v1/projects/%s/locations/global/publishers/google/models/%s:generateContent",
                    projectId, activeModel
            );
            try {
                HttpRequest req = HttpRequest.newBuilder()
                        .uri(URI.create(url))
                        .header("Authorization", "Bearer " + token)
                        .header("Content-Type", "application/json")
                        .timeout(Duration.ofSeconds(90))
                        .POST(HttpRequest.BodyPublishers.ofString(payloadStr))
                        .build();

                HttpResponse<String> resp = HTTP.send(req, HttpResponse.BodyHandlers.ofString());
                if (resp.statusCode() == 429 || resp.statusCode() >= 500) {
                    lastErr = new RuntimeException("Vertex AI HTTP " + resp.statusCode() + " on " + activeModel + ": " + resp.body());
                    Thread.sleep(1500L * (attempt + 1));
                    continue;
                }
                if (resp.statusCode() != 200) {
                    lastErr = new RuntimeException("Vertex AI HTTP " + resp.statusCode() + " on " + activeModel + ": " + resp.body());
                    continue;
                }

                JsonNode root = MAPPER.readTree(resp.body());
                JsonNode parts = root.path("candidates").path(0).path("content").path("parts");
                StringBuilder out = new StringBuilder();
                for (JsonNode part : parts) {
                    if (!part.path("thought").asBoolean(false) && part.has("text")) {
                        out.append(part.path("text").asText());
                    }
                }
                String result = out.toString().trim();
                if (!result.isEmpty()) {
                    return result;
                }
            } catch (Exception e) {
                lastErr = e;
            }
        }
        throw lastErr != null ? lastErr : new RuntimeException("Vertex AI call failed across all fallback models");
    }

    private static PrivateKey parsePemPrivateKey(String pem) throws Exception {
        String cleaned = pem
                .replaceAll("-----\\w+\\s+[A-Z\\s]*KEY-----", "")
                .replaceAll("\\s+", "");
        byte[] der = Base64.getDecoder().decode(cleaned);
        PKCS8EncodedKeySpec spec = new PKCS8EncodedKeySpec(der);
        return KeyFactory.getInstance("RSA").generatePrivate(spec);
    }

    private static String base64Url(byte[] bytes) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
