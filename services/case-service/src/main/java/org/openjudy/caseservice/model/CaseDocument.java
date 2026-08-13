package org.openjudy.caseservice.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import org.openjudy.common.enums.DocumentType;

import java.time.Instant;
import java.util.UUID;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class CaseDocument {

    private UUID id;
    private UUID caseId;
    private String title;
    private DocumentType documentType;
    private String fileName;
    private Long fileSize;
    private String mimeType;
    private String storageUri;
    private Integer pageCount;
    private String ocrStatus; // PENDING, PROCESSING, COMPLETED, FAILED
    private String extractedText;
    private String uploadedBy;
    private Instant uploadedAt;
    private Instant updatedAt;

    public CaseDocument() {
        this.id = UUID.randomUUID();
        this.uploadedAt = Instant.now();
        this.updatedAt = Instant.now();
        this.ocrStatus = "COMPLETED";
    }

    public CaseDocument(UUID id, UUID caseId, String title, DocumentType documentType, String fileName, Long fileSize, String mimeType, String storageUri, Integer pageCount, String uploadedBy) {
        this();
        if (id != null) this.id = id;
        this.caseId = caseId;
        this.title = title;
        this.documentType = documentType;
        this.fileName = fileName;
        this.fileSize = fileSize;
        this.mimeType = mimeType;
        this.storageUri = storageUri;
        this.pageCount = pageCount;
        this.uploadedBy = uploadedBy;
    }

    // Getters and Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getCaseId() { return caseId; }
    public void setCaseId(UUID caseId) { this.caseId = caseId; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public DocumentType getDocumentType() { return documentType; }
    public void setDocumentType(DocumentType documentType) { this.documentType = documentType; }

    public String getFileName() { return fileName; }
    public void setFileName(String fileName) { this.fileName = fileName; }

    public Long getFileSize() { return fileSize; }
    public void setFileSize(Long fileSize) { this.fileSize = fileSize; }

    public String getMimeType() { return mimeType; }
    public void setMimeType(String mimeType) { this.mimeType = mimeType; }

    public String getStorageUri() { return storageUri; }
    public void setStorageUri(String storageUri) { this.storageUri = storageUri; }

    public Integer getPageCount() { return pageCount; }
    public void setPageCount(Integer pageCount) { this.pageCount = pageCount; }

    public String getOcrStatus() { return ocrStatus; }
    public void setOcrStatus(String ocrStatus) { this.ocrStatus = ocrStatus; }

    public String getExtractedText() { return extractedText; }
    public void setExtractedText(String extractedText) { this.extractedText = extractedText; }

    public String getUploadedBy() { return uploadedBy; }
    public void setUploadedBy(String uploadedBy) { this.uploadedBy = uploadedBy; }

    public Instant getUploadedAt() { return uploadedAt; }
    public void setUploadedAt(Instant uploadedAt) { this.uploadedAt = uploadedAt; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
