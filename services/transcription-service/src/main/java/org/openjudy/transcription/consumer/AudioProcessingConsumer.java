package org.openjudy.transcription.consumer;

import io.smallrye.reactive.messaging.annotations.Blocking;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.reactive.messaging.Incoming;
import org.openjudy.common.events.AudioUploadedEvent;
import org.openjudy.transcription.service.TranscriptionService;

@ApplicationScoped
public class AudioProcessingConsumer {

    @Inject
    TranscriptionService transcriptionService;

    @Incoming("audio-uploaded-in")
    @Blocking
    public void consumeAudioUploaded(AudioUploadedEvent event) {
        if (event != null && event.hearingId() != null) {
            transcriptionService.processAudioUploaded(event);
        }
    }
}
