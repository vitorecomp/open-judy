package org.openjudy.users.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rabbitmq.client.Channel;
import com.rabbitmq.client.Connection;
import com.rabbitmq.client.ConnectionFactory;
import com.rabbitmq.client.MessageProperties;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.jboss.logging.Logger;
import org.openjudy.common.events.UserConfigUpdatedEvent;
import org.openjudy.common.events.UserCreatedEvent;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@ApplicationScoped
public class UserEventProducer {

    private static final Logger LOG = Logger.getLogger(UserEventProducer.class);

    @ConfigProperty(name = "rabbitmq.host", defaultValue = "rabbitmq")
    String host;

    @ConfigProperty(name = "rabbitmq.port", defaultValue = "5672")
    int port;

    @ConfigProperty(name = "rabbitmq.username", defaultValue = "judy_user")
    String username;

    @ConfigProperty(name = "rabbitmq.password", defaultValue = "judy_password")
    String password;

    @ConfigProperty(name = "rabbitmq.virtual-host", defaultValue = "/")
    String virtualHost;

    @ConfigProperty(name = "rabbitmq.exchange", defaultValue = "judy.direct")
    String exchange;

    @Inject
    ObjectMapper objectMapper;

    private void publishAuditEvent(Map<String, Object> auditEvent) throws Exception {
        ConnectionFactory factory = new ConnectionFactory();
        factory.setHost(host);
        factory.setPort(port);
        factory.setUsername(username);
        factory.setPassword(password);
        factory.setVirtualHost(virtualHost);
        factory.setConnectionTimeout(2000);
        try (Connection conn = factory.newConnection("user-service-audit");
             Channel ch = conn.createChannel()) {
            ch.exchangeDeclare(exchange, "direct", true);
            ch.queueDeclare("judy.audit.events", true, false, false, null);
            ch.queueBind("judy.audit.events", exchange, "audit.event");
            ch.basicPublish(exchange, "audit.event", MessageProperties.PERSISTENT_TEXT_PLAIN, objectMapper.writeValueAsBytes(auditEvent));
        }
    }

    @Transactional(Transactional.TxType.NOT_SUPPORTED)
    public void emitUserCreated(UserCreatedEvent event) {
        try {
            LOG.infof("Publicando evento UserCreatedEvent no RabbitMQ para o usuário: %s (%s)", event.username(), event.userId());
            publishAuditEvent(Map.of(
                    "id", UUID.randomUUID().toString(),
                    "timestamp", Instant.now().toString(),
                    "actorEmail", event.email() != null ? event.email() : "system@openjudy.jus.br",
                    "actorName", event.fullName() != null ? event.fullName() : event.username(),
                    "actorRole", event.role() != null ? event.role().name() : "ASSESSOR",
                    "action", "USER_CREATED",
                    "category", "SYSTEM",
                    "entityType", "USER",
                    "entityId", event.userId().toString(),
                    "entityName", event.username(),
                    "status", "SUCCESS",
                    "rabbitmqQueue", "judy.audit.events"
            ));
        } catch (Exception e) {
            LOG.warnf("Falha não-bloqueante ao emitir UserCreatedEvent para o RabbitMQ: %s", e.getMessage());
        }
    }

    @Transactional(Transactional.TxType.NOT_SUPPORTED)
    public void emitConfigUpdated(UserConfigUpdatedEvent event) {
        try {
            LOG.infof("Publicando evento UserConfigUpdatedEvent no RabbitMQ para o usuário: %s", event.userId());
            publishAuditEvent(Map.of(
                    "id", UUID.randomUUID().toString(),
                    "timestamp", Instant.now().toString(),
                    "actorEmail", "user@tjsp.jus.br",
                    "actorName", "Usuário do Sistema",
                    "actorRole", "MAGISTRADO",
                    "action", "USER_CONFIG_UPDATED",
                    "category", "ADMIN_CONFIG",
                    "entityType", "USER_CONFIG",
                    "entityId", event.userId().toString(),
                    "entityName", "Preferências do Usuário",
                    "status", "SUCCESS",
                    "rabbitmqQueue", "judy.audit.events"
            ));
        } catch (Exception e) {
            LOG.warnf("Falha não-bloqueante ao emitir UserConfigUpdatedEvent para o RabbitMQ: %s", e.getMessage());
        }
    }
}
