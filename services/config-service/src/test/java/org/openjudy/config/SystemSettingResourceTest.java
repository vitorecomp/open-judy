package org.openjudy.config;

import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.openjudy.config.dto.UpdateSystemSettingRequest;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;

@QuarkusTest
public class SystemSettingResourceTest {

    @Test
    @DisplayName("Deve listar configurações do sistema e filtrar por categoria")
    public void testListSettings() {
        given()
                .when().get("/api/v1/config/settings")
                .then()
                .statusCode(200)
                .body("size()", greaterThanOrEqualTo(5))
                .body("find { it.key == 'gemini.default.model' }.value", equalTo("gemini-4-argon"));

        given()
                .queryParam("category", "AI_CORE")
                .when().get("/api/v1/config/settings")
                .then()
                .statusCode(200)
                .body("find { it.key == 'vector.similarity_threshold' }.value", equalTo("0.75"));
    }

    @Test
    @DisplayName("Deve buscar configuração por chave e atualizar valor")
    public void testGetAndUpdateSetting() {
        given()
                .when().get("/api/v1/config/settings/audio.max_duration_minutes")
                .then()
                .statusCode(200)
                .body("key", equalTo("audio.max_duration_minutes"))
                .body("value", equalTo("240"));

        UpdateSystemSettingRequest updateReq = new UpdateSystemSettingRequest("300", "Duração máxima estendida para 300 minutos");

        given()
                .contentType(ContentType.JSON)
                .body(updateReq)
                .when().put("/api/v1/config/settings/audio.max_duration_minutes")
                .then()
                .statusCode(200)
                .body("value", equalTo("300"))
                .body("description", equalTo("Duração máxima estendida para 300 minutos"));

        // Restore
        UpdateSystemSettingRequest restoreReq = new UpdateSystemSettingRequest("240", "Duração máxima permitida para arquivo individual de audiência em minutos.");
        given()
                .contentType(ContentType.JSON)
                .body(restoreReq)
                .when().put("/api/v1/config/settings/audio.max_duration_minutes")
                .then()
                .statusCode(200)
                .body("value", equalTo("240"));
    }
}
