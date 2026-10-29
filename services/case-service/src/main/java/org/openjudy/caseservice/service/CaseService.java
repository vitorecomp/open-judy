package org.openjudy.caseservice.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.openjudy.caseservice.model.CaseDocument;
import org.openjudy.caseservice.model.JudicialCase;
import org.openjudy.common.enums.LegalBranch;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@ApplicationScoped
public class CaseService {

    private static final Path STORE_PATH = Path.of("target/populated-cases.json");

    @Inject
    ObjectMapper objectMapper;

    private final Map<UUID, JudicialCase> cases = new ConcurrentHashMap<>();

    @PostConstruct
    void init() {
        try {
            if (Files.exists(STORE_PATH)) {
                List<JudicialCase> loaded = objectMapper.readValue(
                        STORE_PATH.toFile(),
                        new TypeReference<List<JudicialCase>>() {}
                );
                for (JudicialCase c : loaded) {
                    if (c.getId() != null) {
                        cases.put(c.getId(), c);
                    }
                }
            }
        } catch (Exception ignored) {}
    }

    private void saveToDisk() {
        try {
            Files.createDirectories(STORE_PATH.getParent());
            objectMapper.writeValue(STORE_PATH.toFile(), new ArrayList<>(cases.values()));
        } catch (Exception ignored) {}
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
        if (c.getCaseNumber() != null) {
            cases.values().removeIf(existing -> c.getCaseNumber().equalsIgnoreCase(existing.getCaseNumber()));
        }
        if (c.getId() == null) {
            c.setId(UUID.randomUUID());
        }
        c.setCreatedAt(Instant.now());
        c.setUpdatedAt(Instant.now());
        if (c.getDocuments() == null) {
            c.setDocuments(new ArrayList<>());
        }
        cases.put(c.getId(), c);
        saveToDisk();
        return c;
    }

    public void clearAllCases() {
        cases.clear();
        saveToDisk();
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
        saveToDisk();

        return Optional.of(existing);
    }

    public boolean deleteCase(UUID id) {
        boolean removed = cases.remove(id) != null;
        if (removed) saveToDisk();
        return removed;
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
