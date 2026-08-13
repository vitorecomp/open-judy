package org.openjudy.config;

import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.openjudy.common.enums.PromptCategory;
import org.openjudy.config.dto.CreatePromptRequest;
import org.openjudy.config.dto.RenderPromptRequest;
import org.openjudy.config.dto.UpdatePromptRequest;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;

@QuarkusTest
public class PromptTemplateResourceTest {

    @Test
    @DisplayName("Deve listar prompts semeados inicialmente")
    public void testListPrompts() {
        given()
                .when().get("/api/v1/config/prompts")
                .then()
                .statusCode(200)
                .body("size()", greaterThanOrEqualTo(4))
                .body("find { it.code == 'PROMPT_ATA_GENERATION' }.name", equalTo("Geração Oficial de Ata de Audiência"))
                .body("find { it.code == 'PROMPT_CONTRADICTION_DETECTION' }.category", equalTo("LEGAL_ANALYSIS"));
    }

    @Test
    @DisplayName("Deve buscar prompt por código único")
    public void testGetPromptByCode() {
        given()
                .when().get("/api/v1/config/prompts/code/PROMPT_ATA_GENERATION")
                .then()
                .statusCode(200)
                .body("code", equalTo("PROMPT_ATA_GENERATION"))
                .body("defaultModel", equalTo("gemini-2.0-flash"))
                .body("category", equalTo("DOCUMENT_GENERATION"));
    }

    @Test
    @DisplayName("Deve renderizar template de prompt com interpolação de variáveis judiciais")
    public void testRenderPrompt() {
        RenderPromptRequest renderReq = new RenderPromptRequest(
                "PROMPT_ATA_GENERATION",
                Map.of(
                        "case_number", "0012345-67.2026.8.26.0100",
                        "court_jurisdiction", "3ª Vara Cível Central de SP",
                        "hearing_type", "INSTRUÇÃO E JULGAMENTO",
                        "judge_name", "Dra. Camila Vasconcelos",
                        "participants_list", "Autor: João da Silva, Réu: Banco X",
                        "transcript_content", "Juíza: Declaro aberta a audiência..."
                )
        );

        given()
                .contentType(ContentType.JSON)
                .body(renderReq)
                .when().post("/api/v1/config/prompts/render")
                .then()
                .statusCode(200)
                .body("promptCode", equalTo("PROMPT_ATA_GENERATION"))
                .body("renderedUserPrompt", containsString("0012345-67.2026.8.26.0100"))
                .body("renderedUserPrompt", containsString("Dra. Camila Vasconcelos"))
                .body("missingVariables.size()", equalTo(0));
    }

    @Test
    @DisplayName("Deve criar, atualizar e excluir um novo prompt customizado")
    public void testPromptCrudLifecycle() {
        String uniqueCode = "PROMPT_TEST_" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        CreatePromptRequest createReq = new CreatePromptRequest(
                uniqueCode,
                "Prompt de Teste Automatizado",
                "Descrição do prompt de teste",
                PromptCategory.LEGAL_ANALYSIS,
                "Você é um assistente de teste",
                "Analise o processo {{case_number}} e o depoimento {{testimony}}",
                List.of("case_number", "testimony"),
                "gemini-2.0-flash",
                0.2,
                4096,
                true
        );

        // 1. Create
        String promptId = given()
                .contentType(ContentType.JSON)
                .body(createReq)
                .when().post("/api/v1/config/prompts")
                .then()
                .statusCode(201)
                .body("code", equalTo(uniqueCode))
                .body("name", equalTo("Prompt de Teste Automatizado"))
                .extract().path("id");

        // 2. Update
        UpdatePromptRequest updateReq = new UpdatePromptRequest(
                "Prompt Atualizado com Sucesso",
                "Nova descrição",
                PromptCategory.SUMMARIZATION,
                "Nova instrução",
                "Resuma {{case_number}}",
                List.of("case_number"),
                "gemini-1.5-pro",
                0.1,
                2048,
                true
        );

        given()
                .contentType(ContentType.JSON)
                .body(updateReq)
                .when().put("/api/v1/config/prompts/" + promptId)
                .then()
                .statusCode(200)
                .body("name", equalTo("Prompt Atualizado com Sucesso"))
                .body("category", equalTo("SUMMARIZATION"))
                .body("version", equalTo(2));

        // 3. Delete
        given()
                .when().delete("/api/v1/config/prompts/" + promptId)
                .then()
                .statusCode(204);

        // 4. Verify Not Found
        given()
                .when().get("/api/v1/config/prompts/" + promptId)
                .then()
                .statusCode(404);
    }
}
