package org.openjudy.config;

import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.openjudy.common.enums.NotificationCategory;
import org.openjudy.common.enums.NotificationChannel;
import org.openjudy.common.enums.NotificationPriority;
import org.openjudy.config.dto.CreateNotificationTypeRequest;
import org.openjudy.config.dto.UpdateNotificationTypeRequest;

import java.util.List;
import java.util.UUID;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;

@QuarkusTest
public class NotificationTypeResourceTest {

    @Test
    @DisplayName("Deve listar tipos de notificação e filtrar por categoria")
    public void testListNotifications() {
        given()
                .when().get("/api/v1/config/notifications")
                .then()
                .statusCode(200)
                .body("size()", greaterThanOrEqualTo(4))
                .body("find { it.code == 'NOTIF_AUDIO_TRANSCRIPTION_COMPLETED' }.category", equalTo("AUDIO_PROCESSING"));

        given()
                .queryParam("category", "LEGAL_ANALYSIS")
                .when().get("/api/v1/config/notifications")
                .then()
                .statusCode(200)
                .body("find { it.code == 'NOTIF_CONTRADICTION_DETECTED' }", notNullValue());
    }

    @Test
    @DisplayName("Deve buscar tipo de notificação por código")
    public void testGetNotificationByCode() {
        given()
                .when().get("/api/v1/config/notifications/code/NOTIF_CONTRADICTION_DETECTED")
                .then()
                .statusCode(200)
                .body("code", equalTo("NOTIF_CONTRADICTION_DETECTED"))
                .body("defaultPriority", equalTo("HIGH"))
                .body("supportedChannels", hasItems("IN_APP", "EMAIL"));
    }

    @Test
    @DisplayName("Deve criar, atualizar e excluir tipo de notificação")
    public void testNotificationCrudLifecycle() {
        String uniqueCode = "NOTIF_TEST_" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        CreateNotificationTypeRequest createReq = new CreateNotificationTypeRequest(
                uniqueCode,
                "Notificação de Teste",
                "Descrição do alerta de teste",
                NotificationCategory.DOCUMENT_WORKFLOW,
                NotificationPriority.NORMAL,
                List.of(NotificationChannel.IN_APP, NotificationChannel.EMAIL),
                "Título: {{case_number}}",
                "Corpo do texto: {{message}}",
                true,
                true
        );

        // 1. Create
        String notifId = given()
                .contentType(ContentType.JSON)
                .body(createReq)
                .when().post("/api/v1/config/notifications")
                .then()
                .statusCode(201)
                .body("code", equalTo(uniqueCode))
                .body("name", equalTo("Notificação de Teste"))
                .extract().path("id");

        // 2. Update
        UpdateNotificationTypeRequest updateReq = new UpdateNotificationTypeRequest(
                "Notificação Atualizada",
                "Nova descrição",
                NotificationCategory.DOCUMENT_WORKFLOW,
                NotificationPriority.HIGH,
                List.of(NotificationChannel.IN_APP, NotificationChannel.WEBSOCKET),
                "Novo Título: {{case_number}}",
                "Novo Corpo: {{message}}",
                false,
                true
        );

        given()
                .contentType(ContentType.JSON)
                .body(updateReq)
                .when().put("/api/v1/config/notifications/" + notifId)
                .then()
                .statusCode(200)
                .body("name", equalTo("Notificação Atualizada"))
                .body("defaultPriority", equalTo("HIGH"))
                .body("supportedChannels", hasItems("IN_APP", "WEBSOCKET"));

        // 3. Delete
        given()
                .when().delete("/api/v1/config/notifications/" + notifId)
                .then()
                .statusCode(204);
    }
}
