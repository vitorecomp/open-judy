package org.openjudy.agentgarden.service;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.annotation.PostConstruct;
import org.openjudy.agentgarden.model.EnterpriseAgent;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@ApplicationScoped
public class AgentRegistryService {

    private final Map<String, EnterpriseAgent> agents = new ConcurrentHashMap<>();

    @PostConstruct
    void initDefaultAgents() {
        // 1. Pesquisa Jurisprudencial Integrada (STF / STJ / TJs / TRTs)
        EnterpriseAgent jurisprudencia = new EnterpriseAgent(
                "agent-juris-01",
                "AGENT_JURISPRUDENCE_SEARCH",
                "Pesquisa Jurisprudencial & Súmulas",
                "Agente especialista em recuperação de julgados, teses de repercussão geral do STF e recursos repetitivos do STJ.",
                "JURISPRUDENCE",
                "Scale",
                "GEMINI_ENTERPRISE_USER_AGENT",
                List.of("Busca Semântica Multitribunal", "Validação de Súmulas Vinculantes", "Análise de Distinguishing"),
                List.of("stf_jurisprudencia_store", "stj_repetitivos_store", "tjsp_acordaos_store"),
                "gemini-2.0-flash",
                true
        );
        jurisprudencia.setSystemInstruction(
                "Você é o Agente de Jurisprudência do Poder Judiciário. Busque e cite precedentes obrigatórios e súmulas com precisão técnica."
        );
        registerAgent(jurisprudencia);

        // 2. Auditor de Contradições e Teses Fáticas
        EnterpriseAgent contradicoes = new EnterpriseAgent(
                "agent-contradiction-02",
                "AGENT_CONTRADICTION_AUDITOR",
                "Auditor de Contradições & Depoimentos",
                "Agente que cruza depoimentos colhidos em audiência com peças processuais para apontar divergências fáticas.",
                "CONTRADICTION_AUDIT",
                "AlertTriangle",
                "ADK",
                List.of("Cruzamento de Depoimentos", "Detecção de Inconsistências", "Mapeamento Fático"),
                List.of("hearings_transcripts_store", "case_documents_store"),
                "gemini-2.0-flash",
                false
        );
        contradicoes.setSystemInstruction(
                "Você é um Auditor Jurídico de Prova Oral. Isole contradições entre testemunhas, réus e autores com timestamps exatos."
        );
        registerAgent(contradicoes);

        // 3. Assistente de Redação de Minutas e Decisões
        EnterpriseAgent redator = new EnterpriseAgent(
                "agent-drafter-03",
                "AGENT_DECISION_DRAFTER",
                "Redator de Decisões & Termos",
                "Agente voltado para elaboração formal de minutas de sentenças, despachos e termos de audiência.",
                "DOCUMENT_GENERATION",
                "FileText",
                "GEMINI_ENTERPRISE_USER_AGENT",
                List.of("Minutas de Atas Judiciais", "Padronização CNJ", "Dosimetria e Dispositivo"),
                List.of("judicial_templates_store", "legal_codes_store"),
                "gemini-2.0-flash",
                false
        );
        redator.setSystemInstruction(
                "Você é o Assistente Oficial de Redação Judicial. Produza peças formais no padrão forense brasileiro com clareza e fundamentação."
        );
        registerAgent(redator);

        // 4. Agente de Pautas e Prazos Processuais
        EnterpriseAgent pautas = new EnterpriseAgent(
                "agent-docket-04",
                "AGENT_DOCKET_MANAGEMENT",
                "Gestor de Pautas & Deliberações",
                "Agente que monitora compromissos assumidos em audiência, prazos peremptórios e intimações.",
                "PROCESS_MANAGEMENT",
                "Calendar",
                "A2A",
                List.of("Extrator de Prazos", "Gestão de Pautas", "Notificações aos Advogados"),
                List.of("case_dockets_store"),
                "gemini-2.0-flash-lite",
                false
        );
        pautas.setSystemInstruction(
                "Você é o Agente de Gestão Processual. Identifique deliberações e prazos fixados em ata para controle de cumprimento."
        );
        registerAgent(pautas);
    }

    public List<EnterpriseAgent> listAgents() {
        return new ArrayList<>(agents.values());
    }

    public Optional<EnterpriseAgent> getAgent(String id) {
        return Optional.ofNullable(agents.get(id));
    }

    public EnterpriseAgent registerAgent(EnterpriseAgent agent) {
        if (agent.getId() == null || agent.getId().isBlank()) {
            agent.setId("agent-" + UUID.randomUUID().toString().substring(0, 8));
        }
        agents.put(agent.getId(), agent);
        return agent;
    }

    public boolean deleteAgent(String id) {
        return agents.remove(id) != null;
    }
}
