package org.openjudy.users;

import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.openjudy.common.enums.UserRole;
import org.openjudy.common.enums.UserStatus;
import org.openjudy.common.security.IapHeaders;
import org.openjudy.users.dto.ChangeStatusRequest;
import org.openjudy.users.dto.CreateUserRequest;
import org.openjudy.users.dto.UpdateUserConfigRequest;

import java.util.UUID;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;

@QuarkusTest
public class UserResourceTest {

    @Test
    @DisplayName("Deve listar usuários existentes semeados")
    public void testListUsers() {
        given()
                .when().get("/api/v1/users")
                .then()
                .statusCode(200)
                .body("size()", greaterThanOrEqualTo(3))
                .body("[0].username", notNullValue());
    }

    @Test
    @DisplayName("Deve buscar usuário padrão logado (me)")
    public void testGetCurrentUser() {
        given()
                .when().get("/api/v1/users/me")
                .then()
                .statusCode(200)
                .body("username", equalTo("camila.vasconcelos"))
                .body("role", equalTo("MAGISTRADO"));
    }

    @Test
    @DisplayName("Deve simular autenticação IAP via cabeçalhos para os 3 perfis: ADMIN, MAGISTRADO e ASSESSOR")
    public void testIapHeaderProfiles() {
        // 1. Magistrado Profile
        given()
                .header(IapHeaders.X_DEV_MOCK_USER, "camila.vasconcelos")
                .when().get("/api/v1/users/me")
                .then()
                .statusCode(200)
                .body("username", equalTo("camila.vasconcelos"))
                .body("role", equalTo("MAGISTRADO"));

        // 2. Assessor Profile
        given()
                .header(IapHeaders.X_DEV_MOCK_USER, "marcos.assessor")
                .when().get("/api/v1/users/me")
                .then()
                .statusCode(200)
                .body("username", equalTo("marcos.assessor"))
                .body("role", equalTo("ASSESSOR"));

        // 3. Admin Profile
        given()
                .header(IapHeaders.X_DEV_MOCK_USER, "admin.judy")
                .when().get("/api/v1/users/me")
                .then()
                .statusCode(200)
                .body("username", equalTo("admin.judy"))
                .body("role", equalTo("ADMIN"));
    }

    @Test
    @DisplayName("Deve provisionar automaticamente usuário JIT via IAP headers")
    public void testIapJustInTimeProvisioning() {
        String randomEmail = "novo.assessor." + UUID.randomUUID().toString().substring(0, 6) + "@tjsp.jus.br";
        given()
                .header(IapHeaders.X_GOOG_AUTHENTICATED_USER_EMAIL, "accounts.google.com:" + randomEmail)
                .header(IapHeaders.X_GOOG_AUTHENTICATED_USER_ID, "accounts.google.com:987654321")
                .when().get("/api/v1/users/me")
                .then()
                .statusCode(200)
                .body("email", equalTo(randomEmail))
                .body("role", equalTo("ASSESSOR"))
                .body("status", equalTo("ACTIVE"));
    }

    @Test
    @DisplayName("Deve listar os 3 perfis do sistema e suas permissões")
    public void testListProfilesAndPermissions() {
        given()
                .when().get("/api/v1/users/roles")
                .then()
                .statusCode(200)
                .body("size()", equalTo(3))
                .body("find { it.role == 'ADMIN' }.canManageUsers", equalTo(true))
                .body("find { it.role == 'MAGISTRADO' }.canSignMinutes", equalTo(true))
                .body("find { it.role == 'ASSESSOR' }.canDraftAta", equalTo(true))
                .body("find { it.role == 'ASSESSOR' }.canSignMinutes", equalTo(false));
    }

    @Test
    @DisplayName("Deve criar, consultar e atualizar preferências de um novo assessor")
    public void testCreateUserAndConfigFlow() {
        String uniqueSuffix = UUID.randomUUID().toString().substring(0, 8);
        CreateUserRequest createReq = new CreateUserRequest(
                "assessor." + uniqueSuffix,
                "assessor." + uniqueSuffix + "@tjsp.jus.br",
                "Carlos Eduardo Mendes",
                "ASSESS-4902",
                UserRole.ASSESSOR,
                "3ª Vara Cível Central da Comarca de São Paulo/SP",
                null,
                null
        );

        // 1. Create User
        String userId = given()
                .contentType(ContentType.JSON)
                .body(createReq)
                .when().post("/api/v1/users")
                .then()
                .statusCode(201)
                .body("username", equalTo("assessor." + uniqueSuffix))
                .body("role", equalTo("ASSESSOR"))
                .body("configuration.theme", equalTo("DARK"))
                .extract().path("id");

        // 2. Get by Username
        given()
                .when().get("/api/v1/users/username/assessor." + uniqueSuffix)
                .then()
                .statusCode(200)
                .body("id", equalTo(userId))
                .body("fullName", equalTo("Carlos Eduardo Mendes"));

        // 3. Update Configurations
        UpdateUserConfigRequest configReq = new UpdateUserConfigRequest(
                "DARK",
                "pt-BR",
                "LARGE",
                true,
                false,
                "HEARINGS",
                1.5,
                true,
                true,
                true,
                false,
                10,
                true,
                true,
                "PADRAO_CIVEL",
                0.3,
                true,
                "FULL_EXCERPT",
                true,
                true,
                true,
                true,
                true,
                null,
                false,
                "Assessor de Gabinete",
                null
        );

        given()
                .contentType(ContentType.JSON)
                .body(configReq)
                .when().put("/api/v1/users/" + userId + "/config")
                .then()
                .statusCode(200)
                .body("playbackRate", equalTo(1.5f))
                .body("fontSize", equalTo("LARGE"))
                .body("highContrast", equalTo(true))
                .body("judgeSignatureTitle", equalTo("Assessor de Gabinete"));

        // 4. Change Status
        ChangeStatusRequest statusReq = new ChangeStatusRequest(UserStatus.SUSPENDED, "Férias regulares");
        given()
                .contentType(ContentType.JSON)
                .body(statusReq)
                .when().patch("/api/v1/users/" + userId + "/status")
                .then()
                .statusCode(200)
                .body("status", equalTo("SUSPENDED"));
    }
}
