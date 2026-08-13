package org.openjudy.common.events;

import org.openjudy.common.enums.MediaType;

import java.time.Instant;
import java.util.UUID;

/**
 * Event published when audio/video recording for a hearing has been successfully uploaded to object storage.
 */
public record AudioUploadedEvent(
    UUID hearingId,
    String caseNumber,
    UUID mediaId,
    String storagePath,
    String storageUrl,
    String originalFilename,
    String mimeType,
    long fileSizeBytes,
    Double durationSeconds,
    MediaType mediaType,
    Instant timestamp
) {
    public AudioUploadedEvent(
        UUID hearingId,
        String caseNumber,
        UUID mediaId,
        String storagePath,
        String storageUrl,
        String originalFilename,
        String mimeType,
        long fileSizeBytes,
        Double durationSeconds,
        Instant timestamp
    ) {
        this(
            hearingId,
            caseNumber,
            mediaId,
            storagePath,
            storageUrl,
            originalFilename,
            mimeType,
            fileSizeBytes,
            durationSeconds,
            MediaType.fromMimeType(mimeType),
            timestamp != null ? timestamp : Instant.now()
        );
    }
}
