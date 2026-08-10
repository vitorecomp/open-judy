package org.openjudy.config;

import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;

@QuarkusTest
public class ConfigOverviewResourceTest {

    @Test
    @DisplayName("Deve retornar visão consolidada com prompts, modelos, dashboards, notificações e configurações")
    public void testGetConfigOverview() {
        given()
                .when().get("/api/v1/config/overview")
                .then()
                .statusCode(200)
                .body("prompts.size()", greaterThanOrEqualTo(4))
                .body("models.size()", greaterThanOrEqualTo(4))
                .body("dashboards.size()", greaterThanOrEqualTo(3))
                .body("notifications.size()", greaterThanOrEqualTo(4))
                .body("settings", notNullValue())
                .body("generatedAt", notNullValue());
    }
}
