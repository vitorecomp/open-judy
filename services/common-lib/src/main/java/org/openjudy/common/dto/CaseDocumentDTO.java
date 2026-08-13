package org.openjudy.common.dto;

import org.openjudy.common.enums.DocumentType;
import java.time.Instant;
import java.util.UUID;

public record CaseDocumentDTO(
    UUID id,
    UUID caseId,
    String title,
    DocumentType documentType,
    String fileName,
    Long fileSize,
    String mimeType,
    String storageUri,
    Integer pageCount,
    String ocrStatus,
    String extractedText,
    String uploadedBy,
    Instant uploadedAt,
    Instant updatedAt
) {
    public CaseDocumentDTO(
        UUID id,
        UUID caseId,
        String title,
        DocumentType documentType,
        String fileName,
        Long fileSize,
        String mimeType,
        String storageUri,
        Integer pageCount,
        String ocrStatus,
        String uploadedBy,
        Instant uploadedAt
    ) {
        this(id, caseId, title, documentType, fileName, fileSize, mimeType, storageUri, pageCount, ocrStatus, null, uploadedBy, uploadedAt, uploadedAt);
    }
}
