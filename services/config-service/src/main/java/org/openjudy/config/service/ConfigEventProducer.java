package org.openjudy.config.service;

import io.smallrye.reactive.messaging.annotations.Broadcast;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.eclipse.microprofile.reactive.messaging.Channel;
import org.eclipse.microprofile.reactive.messaging.Emitter;
import org.jboss.logging.Logger;
import org.openjudy.common.events.ConfigUpdatedEvent;

import java.time.Instant;

@ApplicationScoped
public class ConfigEventProducer {

    private static final Logger LOG = Logger.getLogger(ConfigEventProducer.class);

    @Inject
    @Channel("config-events")
    @Broadcast
    Emitter<ConfigUpdatedEvent> configEventEmitter;

    @Transactional(Transactional.TxType.NOT_SUPPORTED)
    public void emitConfigUpdated(String configType, String entityCode, String action) {
        ConfigUpdatedEvent event = new ConfigUpdatedEvent(
                configType,
                entityCode,
                action,
                Instant.now()
        );
        try {
            configEventEmitter.send(event);
            LOG.infof("Published ConfigUpdatedEvent: type=%s, code=%s, action=%s", configType, entityCode, action);
        } catch (Exception e) {
            LOG.warnf("Could not emit ConfigUpdatedEvent to Kafka (fallback mode): %s", e.getMessage());
        }
    }
}
