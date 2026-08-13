package org.openjudy.caseservice.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import org.openjudy.common.enums.LegalBranch;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class JudicialCase {

    private UUID id;
    private String caseNumber; // 0014238-89.2024.8.26.0100 (CNJ format)
    private String courtJurisdiction; // 2ª Vara Cível de São Paulo
    private LegalBranch legalBranch;
    private String subject; // Direito do Trabalho / Rescisão Indireta
    private String plaintiffName; // Autor
    private String defendantName; // Réu
    private String judgeName; // Magistrado
    private String prosecutorName; // Promotor
    private String status; // DISTRIBUIDO, EM_ANDAMENTO, AUDIENCIA_DESIGNADA, JULGADO, ARQUIVADO
    private Instant distributionDate;
    private List<CaseDocument> documents;
    private List<UUID> hearingIds;
    private Instant createdAt;
    private Instant updatedAt;

    public JudicialCase() {
        this.id = UUID.randomUUID();
        this.status = "EM_ANDAMENTO";
        this.documents = new ArrayList<>();
        this.hearingIds = new ArrayList<>();
        this.distributionDate = Instant.now();
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    public JudicialCase(UUID id, String caseNumber, String courtJurisdiction, LegalBranch legalBranch, String subject, String plaintiffName, String defendantName, String judgeName) {
        this();
        if (id != null) this.id = id;
        this.caseNumber = caseNumber;
        this.courtJurisdiction = courtJurisdiction;
        this.legalBranch = legalBranch;
        this.subject = subject;
        this.plaintiffName = plaintiffName;
        this.defendantName = defendantName;
        this.judgeName = judgeName;
    }

    // Getters and Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getCaseNumber() { return caseNumber; }
    public void setCaseNumber(String caseNumber) { this.caseNumber = caseNumber; }

    public String getCourtJurisdiction() { return courtJurisdiction; }
    public void setCourtJurisdiction(String courtJurisdiction) { this.courtJurisdiction = courtJurisdiction; }

    public LegalBranch getLegalBranch() { return legalBranch; }
    public void setLegalBranch(LegalBranch legalBranch) { this.legalBranch = legalBranch; }

    public String getSubject() { return subject; }
    public void setSubject(String subject) { this.subject = subject; }

    public String getPlaintiffName() { return plaintiffName; }
    public void setPlaintiffName(String plaintiffName) { this.plaintiffName = plaintiffName; }

    public String getDefendantName() { return defendantName; }
    public void setDefendantName(String defendantName) { this.defendantName = defendantName; }

    public String getJudgeName() { return judgeName; }
    public void setJudgeName(String judgeName) { this.judgeName = judgeName; }

    public String getProsecutorName() { return prosecutorName; }
    public void setProsecutorName(String prosecutorName) { this.prosecutorName = prosecutorName; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Instant getDistributionDate() { return distributionDate; }
    public void setDistributionDate(Instant distributionDate) { this.distributionDate = distributionDate; }

    public List<CaseDocument> getDocuments() { return documents; }
    public void setDocuments(List<CaseDocument> documents) { this.documents = documents; }

    public List<UUID> getHearingIds() { return hearingIds; }
    public void setHearingIds(List<UUID> hearingIds) { this.hearingIds = hearingIds; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
