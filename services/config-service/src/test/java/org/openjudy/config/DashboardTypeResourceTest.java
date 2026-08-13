package org.openjudy.config;

import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.openjudy.config.dto.CreateDashboardTypeRequest;
import org.openjudy.config.dto.UpdateDashboardTypeRequest;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;

@QuarkusTest
public class DashboardTypeResourceTest {

    @Test
    @DisplayName("Deve listar dashboards existentes e filtrar por perfil de magistrado")
    public void testListDashboards() {
        given()
                .when().get("/api/v1/config/dashboards")
                .then()
                .statusCode(200)
                .body("size()", greaterThanOrEqualTo(3))
                .body("find { it.code == 'DASHBOARD_MAGISTRADO' }.name", equalTo("Painel do Magistrado(a)"));

        given()
                .queryParam("role", "MAGISTRADO")
                .when().get("/api/v1/config/dashboards")
                .then()
                .statusCode(200)
                .body("find { it.code == 'DASHBOARD_MAGISTRADO' }", notNullValue());
    }

    @Test
    @DisplayName("Deve buscar dashboard por código")
    public void testGetDashboardByCode() {
        given()
                .when().get("/api/v1/config/dashboards/code/DASHBOARD_MAGISTRADO")
                .then()
                .statusCode(200)
                .body("code", equalTo("DASHBOARD_MAGISTRADO"))
                .body("targetRole", equalTo("MAGISTRADO"))
                .body("widgets.size()", greaterThanOrEqualTo(3));
    }

    @Test
    @DisplayName("Deve criar, atualizar e excluir tipo de dashboard")
    public void testDashboardCrudLifecycle() {
        String uniqueCode = "DASHBOARD_TEST_" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        CreateDashboardTypeRequest createReq = new CreateDashboardTypeRequest(
                uniqueCode,
                "Dashboard de Teste",
                "Descrição do painel",
                "DEFENSOR",
                "GRID",
                List.of(Map.of("id", "w1", "title", "Casos Atribuídos", "type", "CASE_LIST")),
                false,
                true
        );

        // 1. Create
        String dashboardId = given()
                .contentType(ContentType.JSON)
                .body(createReq)
                .when().post("/api/v1/config/dashboards")
                .then()
                .statusCode(201)
                .body("code", equalTo(uniqueCode))
                .body("targetRole", equalTo("DEFENSOR"))
                .extract().path("id");

        // 2. Update
        UpdateDashboardTypeRequest updateReq = new UpdateDashboardTypeRequest(
                "Dashboard Defensor Atualizado",
                "Nova descrição",
                "DEFENSOR",
                "TABBED",
                List.of(Map.of("id", "w1", "title", "Casos", "type", "CASE_LIST"), Map.of("id", "w2", "title", "Pautas", "type", "CALENDAR")),
                true,
                true
        );

        given()
                .contentType(ContentType.JSON)
                .body(updateReq)
                .when().put("/api/v1/config/dashboards/" + dashboardId)
                .then()
                .statusCode(200)
                .body("name", equalTo("Dashboard Defensor Atualizado"))
                .body("layoutType", equalTo("TABBED"))
                .body("widgets.size()", equalTo(2));

        // 3. Delete
        given()
                .when().delete("/api/v1/config/dashboards/" + dashboardId)
                .then()
                .statusCode(204);
    }
}
