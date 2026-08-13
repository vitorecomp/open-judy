package org.openjudy.config;

import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.openjudy.common.enums.AiModelProvider;
import org.openjudy.common.enums.AiModelType;
import org.openjudy.config.dto.CreateAiModelRequest;
import org.openjudy.config.dto.UpdateAiModelRequest;

import java.util.Map;
import java.util.UUID;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;

@QuarkusTest
public class AiModelResourceTest {

    @Test
    @DisplayName("Deve listar modelos de IA semeados")
    public void testListModels() {
        given()
                .when().get("/api/v1/config/models")
                .then()
                .statusCode(200)
                .body("size()", greaterThanOrEqualTo(4))
                .body("find { it.modelId == 'gemini-2.0-flash' }.name", equalTo("Google Gemini 2.0 Flash"))
                .body("find { it.modelId == 'gemini-2.0-flash' }.isDefault", equalTo(true));
    }

    @Test
    @DisplayName("Deve obter modelo padrão para LLM_MULTIMODAL")
    public void testGetDefaultModel() {
        given()
                .when().get("/api/v1/config/models/default/LLM_MULTIMODAL")
                .then()
                .statusCode(200)
                .body("modelId", equalTo("gemini-2.0-flash"))
                .body("provider", equalTo("GOOGLE_GEMINI"));
    }

    @Test
    @DisplayName("Deve criar novo modelo de IA e alterar status de modelo padrão")
    public void testModelLifecycleAndSetDefault() {
        String uniqueModelId = "custom-model-" + UUID.randomUUID().toString().substring(0, 8);
        CreateAiModelRequest createReq = new CreateAiModelRequest(
                uniqueModelId,
                "Custom Test Model",
                AiModelProvider.GOOGLE_GEMINI,
                AiModelType.LLM_TEXT,
                "Modelo para testes de texto",
                524288,
                4096,
                false,
                false,
                true,
                true,
                0.0002,
                0.0008,
                false,
                true,
                Map.of("temperature", 0.1)
        );

        // 1. Create
        String modelUuid = given()
                .contentType(ContentType.JSON)
                .body(createReq)
                .when().post("/api/v1/config/models")
                .then()
                .statusCode(201)
                .body("modelId", equalTo(uniqueModelId))
                .body("name", equalTo("Custom Test Model"))
                .extract().path("id");

        // 2. Set Default
        given()
                .when().patch("/api/v1/config/models/" + modelUuid + "/set-default")
                .then()
                .statusCode(200)
                .body("isDefault", equalTo(true));

        // 3. Update
        UpdateAiModelRequest updateReq = new UpdateAiModelRequest(
                "Updated Custom Model",
                AiModelProvider.VERTEX_AI,
                AiModelType.LLM_TEXT,
                "Descrição atualizada",
                1048576,
                8192,
                true,
                true,
                true,
                true,
                0.0001,
                0.0005,
                true,
                true,
                Map.of("temperature", 0.3)
        );

        given()
                .contentType(ContentType.JSON)
                .body(updateReq)
                .when().put("/api/v1/config/models/" + modelUuid)
                .then()
                .statusCode(200)
                .body("name", equalTo("Updated Custom Model"))
                .body("provider", equalTo("VERTEX_AI"));

        // 4. Delete
        given()
                .when().delete("/api/v1/config/models/" + modelUuid)
                .then()
                .statusCode(204);
    }
}
