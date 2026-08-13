package org.openjudy.common.enums;

/**
 * Media type representation for judicial hearing recordings (Audio or Video).
 */
public enum MediaType {
    AUDIO("Gravação em Áudio", "audio/*"),
    VIDEO("Gravação em Vídeo", "video/*");

    private final String description;
    private final String mimeTypePrefix;

    MediaType(String description, String mimeTypePrefix) {
        this.description = description;
        this.mimeTypePrefix = mimeTypePrefix;
    }

    public String getDescription() {
        return description;
    }

    public String getMimeTypePrefix() {
        return mimeTypePrefix;
    }

    public static MediaType fromMimeType(String mimeType) {
        if (mimeType != null && mimeType.toLowerCase().startsWith("video/")) {
            return VIDEO;
        }
        return AUDIO;
    }

    public static MediaType fromFilename(String filename) {
        if (filename == null) return AUDIO;
        String lower = filename.toLowerCase();
        if (lower.endsWith(".mp4") || lower.endsWith(".webm") || lower.endsWith(".mkv") ||
            lower.endsWith(".mov") || lower.endsWith(".avi") || lower.endsWith(".m4v")) {
            return VIDEO;
        }
        return AUDIO;
    }
}
