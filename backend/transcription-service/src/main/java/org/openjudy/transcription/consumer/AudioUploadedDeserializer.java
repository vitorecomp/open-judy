package org.openjudy.transcription.consumer;

import io.quarkus.kafka.client.serialization.ObjectMapperDeserializer;
import org.openjudy.common.events.AudioUploadedEvent;

public class AudioUploadedDeserializer extends ObjectMapperDeserializer<AudioUploadedEvent> {
    public AudioUploadedDeserializer() {
        super(AudioUploadedEvent.class);
    }
}
