package org.openjudy.users;

import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;
import org.openjudy.common.dto.SystemConfigurationDTO;

import java.util.Map;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;

@QuarkusTest
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
public class SystemConfigurationResourceTest {

    @Test
    @Order(1)
    @DisplayName("Deve obter as configurações globais do sistema incluindo nome e logo")
    public void testGetSystemConfig() {
        given()
                .when().get("/api/v1/system/config")
                .then()
                .statusCode(200)
                .body("systemName", anyOf(equalTo("Open Judy"), equalTo("Tribunal de Justiça - Open Judy")))
                .body("geminiModel", notNullValue());
    }

    @Test
    @Order(2)
    @DisplayName("Deve atualizar o nome do sistema e a logo via PUT")
    public void testUpdateSystemNameAndLogo() {
        SystemConfigurationDTO updateReq = new SystemConfigurationDTO(
                null,
                "Tribunal de Justiça - Open Judy",
                "https://cdn.tjsp.jus.br/assets/logo.png",
                "gemini-2.0-flash",
                "text-embedding-004",
                300,
                0.80,
                true,
                730,
                false,
                "pt-BR",
                "judy-audio-tjsp",
                Map.of("copilotMaxHistoryTurns", 25),
                null
        );

        given()
                .contentType(ContentType.JSON)
                .body(updateReq)
                .when().put("/api/v1/system/config")
                .then()
                .statusCode(200)
                .body("systemName", equalTo("Tribunal de Justiça - Open Judy"))
                .body("logoUrl", equalTo("https://cdn.tjsp.jus.br/assets/logo.png"))
                .body("maxAudioDurationMinutes", equalTo(300))
                .body("vectorSimilarityThreshold", equalTo(0.8f));

        // Restore default systemName for idempotency across test runs
        SystemConfigurationDTO restoreReq = new SystemConfigurationDTO(
                null,
                "Open Judy",
                "https://cdn.tjsp.jus.br/assets/logo.png",
                "gemini-2.0-flash",
                "text-embedding-004",
                240,
                0.75,
                true,
                365,
                false,
                "pt-BR",
                "open-judy-audio-archive",
                Map.of("copilotMaxHistoryTurns", 20),
                null
        );

        given()
                .contentType(ContentType.JSON)
                .body(restoreReq)
                .when().put("/api/v1/system/config")
                .then()
                .statusCode(200)
                .body("systemName", equalTo("Open Judy"));
    }
}
