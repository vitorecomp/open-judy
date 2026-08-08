package org.openjudy.common.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

import java.util.List;

/**
 * System and judicial roles for Open Judy users.
 * Core profiles: ADMIN, MAGISTRADO, ASSESSOR (with ACESSOR alias).
 */
public enum UserRole {
    ADMIN("Administrador", "Acesso irrestrito a usuários, configurações globais, modelos de IA e logs de auditoria"),
    MAGISTRADO("Magistrado", "Condução de audiências, análise jurídica integral, aprovação e assinatura digital de atas"),
    ASSESSOR("Assessor", "Elaboração de minutas de atas, análise de contradições, pesquisas jurídicas e suporte ao gabinete"),
    
    // Alias / legacy compatibility mappings
    ACESSOR("Assessor", "Alias para Assessor de Gabinete"),
    PROMOTOR("Ministério Público", "Promotor de Justiça / Procurador"),
    DEFENSOR_PUBLICO("Defensoria Pública", "Defensor Público"),
    ADVOGADO("Advogado", "Advogado constituído"),
    ESCRIVAO("Escrivão", "Escrivão / Chefe de Secretaria"),
    ANALISTA_JUDICIARIO("Analista Judiciário", "Analista Judiciário"),
    USUARIO_EXTERNO("Usuário Externo", "Usuário Externo / Parte");

    private final String title;
    private final String description;

    UserRole(String description) {
        this.title = description;
        this.description = description;
    }

    UserRole(String title, String description) {
        this.title = title;
        this.description = description;
    }

    public String getTitle() {
        return title;
    }

    public String getDescription() {
        return description;
    }

    @JsonValue
    public String getRoleName() {
        // Return canonical profile name
        if (this == ACESSOR) {
            return ASSESSOR.name();
        }
        return name();
    }

    @JsonCreator
    public static UserRole fromString(String value) {
        if (value == null || value.trim().isEmpty()) {
            return ASSESSOR;
        }
        String normalized = value.trim().toUpperCase()
                .replace(" ", "_")
                .replace("-", "_");

        if (normalized.equals("ADMIN") || normalized.equals("ADMINISTRADOR") || normalized.equals("ADMINISTRADORA")) {
            return ADMIN;
        }
        if (normalized.equals("MAGISTRADO") || normalized.equals("MAGISTRADA") || normalized.equals("JUIZ") || normalized.equals("JUIZA")) {
            return MAGISTRADO;
        }
        if (normalized.equals("ASSESSOR") || normalized.equals("ASSESSORA") || normalized.equals("ACESSOR") || normalized.equals("ACESSORA")) {
            return ASSESSOR;
        }

        for (UserRole role : values()) {
            if (role.name().equalsIgnoreCase(normalized)) {
                return role;
            }
        }
        return ASSESSOR;
    }

    // Permission and capability helpers
    public boolean isAdmin() {
        return this == ADMIN;
    }

    public boolean isMagistrado() {
        return this == MAGISTRADO;
    }

    public boolean isAssessor() {
        return this == ASSESSOR || this == ACESSOR;
    }

    public boolean canSignMinutes() {
        return this == MAGISTRADO;
    }

    public boolean canApproveAta() {
        return this == MAGISTRADO;
    }

    public boolean canDraftAta() {
        return this == MAGISTRADO || this == ASSESSOR || this == ACESSOR || this == ESCRIVAO;
    }

    public boolean canManageUsers() {
        return this == ADMIN;
    }

    public boolean canEditSystemConfig() {
        return this == ADMIN;
    }

    public List<String> getGrantedPermissions() {
        if (isAdmin()) {
            return List.of(
                    "users:read", "users:write", "users:delete",
                    "system:config", "system:audit",
                    "cases:read", "cases:write",
                    "hearings:read", "hearings:write",
                    "atas:read", "atas:draft",
                    "ai:copilot"
            );
        } else if (isMagistrado()) {
            return List.of(
                    "cases:read", "cases:write",
                    "hearings:read", "hearings:write", "hearings:conduct",
                    "atas:read", "atas:draft", "atas:approve", "atas:sign",
                    "ai:copilot", "ai:analyze"
            );
        } else {
            return List.of(
                    "cases:read",
                    "hearings:read",
                    "atas:read", "atas:draft", "atas:propose",
                    "ai:copilot"
            );
        }
    }
}
