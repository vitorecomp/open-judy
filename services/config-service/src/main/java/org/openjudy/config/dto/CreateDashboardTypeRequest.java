package org.openjudy.config.dto;

import jakarta.validation.constraints.NotBlank;

import java.util.List;
import java.util.Map;

public record CreateDashboardTypeRequest(
        @NotBlank(message = "O código do dashboard é obrigatório (ex: DASHBOARD_MAGISTRADO)")
        String code,

        @NotBlank(message = "O nome do dashboard é obrigatório")
        String name,

        String description,

        @NotBlank(message = "O perfil de destino é obrigatório (ex: MAGISTRADO, ASSESSOR, ADMIN, ALL)")
        String targetRole,

        String layoutType,

        List<Map<String, Object>> widgets,

        Boolean defaultLanding,

        Boolean active
) {
}
