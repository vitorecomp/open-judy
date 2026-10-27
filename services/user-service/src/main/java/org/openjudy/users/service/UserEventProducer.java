package org.openjudy.users.service;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.eclipse.microprofile.reactive.messaging.Channel;
import org.eclipse.microprofile.reactive.messaging.Emitter;
import org.jboss.logging.Logger;
import org.openjudy.common.events.UserConfigUpdatedEvent;
import org.openjudy.common.events.UserCreatedEvent;

@ApplicationScoped
public class UserEventProducer {

    private static final Logger LOG = Logger.getLogger(UserEventProducer.class);

    @Inject
    @Channel("user-events")
    Emitter<Object> eventEmitter;

    @Transactional(Transactional.TxType.NOT_SUPPORTED)
    public void emitUserCreated(UserCreatedEvent event) {
        try {
            LOG.infof("Publicando evento UserCreatedEvent para o usuário: %s (%s)", event.username(), event.userId());
            eventEmitter.send(event);
        } catch (Exception e) {
            LOG.warnf("Falha não-bloqueante ao emitir UserCreatedEvent para o Kafka: %s", e.getMessage());
        }
    }

    @Transactional(Transactional.TxType.NOT_SUPPORTED)
    public void emitConfigUpdated(UserConfigUpdatedEvent event) {
        try {
            LOG.infof("Publicando evento UserConfigUpdatedEvent para o usuário: %s", event.userId());
            eventEmitter.send(event);
        } catch (Exception e) {
            LOG.warnf("Falha não-bloqueante ao emitir UserConfigUpdatedEvent para o Kafka: %s", e.getMessage());
        }
    }
}
