package org.openjudy.caseservice.service;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.annotation.PostConstruct;
import org.openjudy.caseservice.model.CaseDocument;
import org.openjudy.caseservice.model.JudicialCase;
import org.openjudy.common.enums.DocumentType;
import org.openjudy.common.enums.LegalBranch;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@ApplicationScoped
public class CaseService {

    private final Map<UUID, JudicialCase> cases = new ConcurrentHashMap<>();

    @PostConstruct
    void initSampleCasesAndDocuments() {
        // Case 1: Reclamação Trabalhista - Horas Extras e Rescisão
        UUID caseId1 = UUID.fromString("f1e2d3c4-b5a6-9788-7654-3210fedcba98");
        JudicialCase c1 = new JudicialCase(
                caseId1,
                "0014238-89.2024.8.26.0100",
                "2ª Vara Cível da Comarca de São Paulo",
                LegalBranch.CIVIL,
                "Indenização por Danos Morais e Rescisão Contratual",
                "Carlos Eduardo Mendes",
                "Construtora e Incorporadora Metrópole S.A.",
                "Dra. Camila Vasconcelos"
        );
        c1.setStatus("EM_ANDAMENTO");
        c1.setProsecutorName("Dr. Fernando Meirelles");
        c1.getHearingIds().add(UUID.fromString("f1e2d3c4-b5a6-9788-7654-3210fedcba98"));

        // Documents for Case 1
        c1.getDocuments().add(new CaseDocument(
                UUID.randomUUID(), caseId1,
                "Petição Inicial com Pedido Liminar de Urgência",
                DocumentType.PETICAO_INICIAL,
                "peticao_inicial_0014238.pdf",
                1420500L, "application/pdf",
                "s3://open-judy-docs/0014238/peticao_inicial.pdf",
                18, "Dra. Luciana Ferreira"
        ));
        c1.getDocuments().add(new CaseDocument(
                UUID.randomUUID(), caseId1,
                "Procuração Ad Judicia e Comprovante de Custas",
                DocumentType.PROCURACAO,
                "procuracao_comprovante_custas.pdf",
                250300L, "application/pdf",
                "s3://open-judy-docs/0014238/procuracao.pdf",
                2, "Dra. Luciana Ferreira"
        ));
        c1.getDocuments().add(new CaseDocument(
                UUID.randomUUID(), caseId1,
                "Contestação com Documentos e Preliminares",
                DocumentType.CONTESTACAO,
                "contestacao_metropole_sa.pdf",
                3100200L, "application/pdf",
                "s3://open-judy-docs/0014238/contestacao.pdf",
                34, "Dr. Roberto Silva"
        ));
        c1.getDocuments().add(new CaseDocument(
                UUID.randomUUID(), caseId1,
                "Laudo Pericial de Engenharia Civil e Segurança da Obra",
                DocumentType.LAUDO_TECNICO,
                "laudo_pericial_engenharia.pdf",
                5420100L, "application/pdf",
                "s3://open-judy-docs/0014238/laudo_pericial.pdf",
                42, "Perito Eng. Marcelo Rossi"
        ));
        c1.getDocuments().add(new CaseDocument(
                UUID.randomUUID(), caseId1,
                "Termo e Ata de Audiência de Instrução e Julgamento",
                DocumentType.ATA_AUDIENCIA,
                "ata_audiencia_instrucao.pdf",
                320100L, "application/pdf",
                "s3://open-judy-docs/0014238/ata_audiencia.pdf",
                4, "Open Judy AI System"
        ));
        cases.put(c1.getId(), c1);

        // Case 2: Ação de Cobrança e Execução de Título
        UUID caseId2 = UUID.randomUUID();
        JudicialCase c2 = new JudicialCase(
                caseId2,
                "0004521-12.2024.5.02.0001",
                "1ª Vara do Trabalho da Zona Sul",
                LegalBranch.LABOR,
                "Horas Extras, Intervalo Intrajornada e Equiparação Salarial",
                "Juliana Almeida Prado",
                "Banco Continental de Investimentos S.A.",
                "Dr. Alexandre Martins"
        );
        c2.setStatus("AUDIENCIA_DESIGNADA");
        c2.getDocuments().add(new CaseDocument(
                UUID.randomUUID(), caseId2,
                "Petição Inicial Trabalhista e Cartões de Ponto",
                DocumentType.PETICAO_INICIAL,
                "peticao_trabalhista_juliana.pdf",
                2100400L, "application/pdf",
                "s3://open-judy-docs/0004521/peticao.pdf",
                24, "Dr. Thiago Barreto"
        ));
        c2.getDocuments().add(new CaseDocument(
                UUID.randomUUID(), caseId2,
                "Contestação com Registros de Ponto Eletrônico",
                DocumentType.CONTESTACAO,
                "contestacao_banco_continental.pdf",
                4500100L, "application/pdf",
                "s3://open-judy-docs/0004521/contestacao.pdf",
                52, "Dra. Beatriz Toledo"
        ));
        cases.put(c2.getId(), c2);

        // Case 3: Ação Penal - Estelionato Qualificado
        UUID caseId3 = UUID.randomUUID();
        JudicialCase c3 = new JudicialCase(
                caseId3,
                "0009832-44.2024.8.19.0001",
                "4ª Vara Criminal da Capital - RJ",
                LegalBranch.CRIMINAL,
                "Art. 171 do CP - Fraude Eletrônica e Associação Criminosa",
                "Ministério Público do Estado",
                "Rodrigo Santoro de Oliveira e Outros",
                "Dra. Mariana Bittencourt"
        );
        c3.setStatus("EM_ANDAMENTO");
        c3.setProsecutorName("Dr. Carlos Alberto Gouveia");
        c3.getDocuments().add(new CaseDocument(
                UUID.randomUUID(), caseId3,
                "Denúncia do Ministério Público e Relatório Policial",
                DocumentType.PETICAO_INICIAL,
                "denuncia_mperj_0009832.pdf",
                1800000L, "application/pdf",
                "s3://open-judy-docs/0009832/denuncia.pdf",
                16, "Dr. Carlos Alberto Gouveia"
        ));
        c3.getDocuments().add(new CaseDocument(
                UUID.randomUUID(), caseId3,
                "Relatório Técnico de Perícia Forense Digital",
                DocumentType.LAUDO_TECNICO,
                "pericia_forense_digital.pdf",
                8900400L, "application/pdf",
                "s3://open-judy-docs/0009832/pericia.pdf",
                68, "Instituto de Criminalística"
        ));
        cases.put(c3.getId(), c3);
    }

    public List<JudicialCase> listCases(String search, String status, LegalBranch branch) {
        return cases.values().stream()
                .filter(c -> {
                    if (search != null && !search.isBlank()) {
                        String s = search.toLowerCase();
                        boolean match = c.getCaseNumber().toLowerCase().contains(s)
                                || (c.getSubject() != null && c.getSubject().toLowerCase().contains(s))
                                || (c.getPlaintiffName() != null && c.getPlaintiffName().toLowerCase().contains(s))
                                || (c.getDefendantName() != null && c.getDefendantName().toLowerCase().contains(s))
                                || (c.getCourtJurisdiction() != null && c.getCourtJurisdiction().toLowerCase().contains(s));
                        if (!match) return false;
                    }
                    if (status != null && !status.isBlank() && !status.equalsIgnoreCase("ALL")) {
                        if (!c.getStatus().equalsIgnoreCase(status)) return false;
                    }
                    if (branch != null) {
                        if (c.getLegalBranch() != branch) return false;
                    }
                    return true;
                })
                .sorted(Comparator.comparing(JudicialCase::getUpdatedAt).reversed())
                .collect(Collectors.toList());
    }

    public Optional<JudicialCase> getCase(UUID id) {
        return Optional.ofNullable(cases.get(id));
    }

    public Optional<JudicialCase> getCaseByNumber(String caseNumber) {
        return cases.values().stream()
                .filter(c -> c.getCaseNumber().equalsIgnoreCase(caseNumber))
                .findFirst();
    }

    public JudicialCase createCase(JudicialCase c) {
        if (c.getId() == null) {
            c.setId(UUID.randomUUID());
        }
        c.setCreatedAt(Instant.now());
        c.setUpdatedAt(Instant.now());
        if (c.getDocuments() == null) {
            c.setDocuments(new ArrayList<>());
        }
        cases.put(c.getId(), c);
        return c;
    }

    public Optional<JudicialCase> updateCase(UUID id, JudicialCase update) {
        JudicialCase existing = cases.get(id);
        if (existing == null) return Optional.empty();

        if (update.getCaseNumber() != null) existing.setCaseNumber(update.getCaseNumber());
        if (update.getCourtJurisdiction() != null) existing.setCourtJurisdiction(update.getCourtJurisdiction());
        if (update.getSubject() != null) existing.setSubject(update.getSubject());
        if (update.getPlaintiffName() != null) existing.setPlaintiffName(update.getPlaintiffName());
        if (update.getDefendantName() != null) existing.setDefendantName(update.getDefendantName());
        if (update.getJudgeName() != null) existing.setJudgeName(update.getJudgeName());
        if (update.getProsecutorName() != null) existing.setProsecutorName(update.getProsecutorName());
        if (update.getStatus() != null) existing.setStatus(update.getStatus());
        if (update.getLegalBranch() != null) existing.setLegalBranch(update.getLegalBranch());
        existing.setUpdatedAt(Instant.now());

        return Optional.of(existing);
    }

    public boolean deleteCase(UUID id) {
        return cases.remove(id) != null;
    }

    // =========================================================================
    // Case Documents Management
    // =========================================================================

    public List<CaseDocument> listDocuments(UUID caseId) {
        JudicialCase c = cases.get(caseId);
        if (c == null || c.getDocuments() == null) return Collections.emptyList();
        return c.getDocuments();
    }

    public Optional<CaseDocument> getDocument(UUID caseId, UUID docId) {
        JudicialCase c = cases.get(caseId);
        if (c == null || c.getDocuments() == null) return Optional.empty();
        return c.getDocuments().stream().filter(d -> d.getId().equals(docId)).findFirst();
    }

    public Optional<CaseDocument> addDocument(UUID caseId, CaseDocument doc) {
        JudicialCase c = cases.get(caseId);
        if (c == null) return Optional.empty();

        if (doc.getId() == null) doc.setId(UUID.randomUUID());
        doc.setCaseId(caseId);
        doc.setUploadedAt(Instant.now());
        doc.setUpdatedAt(Instant.now());
        if (doc.getOcrStatus() == null) doc.setOcrStatus("COMPLETED");

        c.getDocuments().add(doc);
        c.setUpdatedAt(Instant.now());
        return Optional.of(doc);
    }

    public boolean deleteDocument(UUID caseId, UUID docId) {
        JudicialCase c = cases.get(caseId);
        if (c == null || c.getDocuments() == null) return false;
        boolean removed = c.getDocuments().removeIf(d -> d.getId().equals(docId));
        if (removed) {
            c.setUpdatedAt(Instant.now());
        }
        return removed;
    }
}
