package org.openjudy.config.service;

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

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@ApplicationScoped
public class ConfigEventProducer {

    private static final Logger LOG = Logger.getLogger(ConfigEventProducer.class);

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

    @Transactional(Transactional.TxType.NOT_SUPPORTED)
    public void emitConfigUpdated(String configType, String entityCode, String action) {
        try {
            ConnectionFactory factory = new ConnectionFactory();
            factory.setHost(host);
            factory.setPort(port);
            factory.setUsername(username);
            factory.setPassword(password);
            factory.setVirtualHost(virtualHost);
            factory.setConnectionTimeout(2000);
            try (Connection conn = factory.newConnection("config-service-audit");
                 Channel ch = conn.createChannel()) {
                ch.exchangeDeclare(exchange, "direct", true);
                ch.queueDeclare("judy.audit.events", true, false, false, null);
                ch.queueBind("judy.audit.events", exchange, "audit.event");
                Map<String, Object> auditEvent = Map.of(
                        "id", UUID.randomUUID().toString(),
                        "timestamp", Instant.now().toString(),
                        "actorEmail", "admin@tjsp.jus.br",
                        "actorName", "Administrador do Sistema",
                        "actorRole", "ADMIN",
                        "action", "PROMPT".equalsIgnoreCase(configType) ? "PROMPT_" + action : "CONFIG_" + action,
                        "category", "ADMIN_CONFIG",
                        "entityType", configType,
                        "entityId", entityCode,
                        "entityName", entityCode,
                        "status", "SUCCESS",
                        "rabbitmqQueue", "judy.audit.events"
                );
                ch.basicPublish(exchange, "audit.event", MessageProperties.PERSISTENT_TEXT_PLAIN, objectMapper.writeValueAsBytes(auditEvent));
            }
            LOG.infof("Published ConfigUpdatedEvent to RabbitMQ judy.audit.events: type=%s, code=%s, action=%s", configType, entityCode, action);
        } catch (Exception e) {
            LOG.warnf("Could not emit ConfigUpdatedEvent to RabbitMQ (non-blocking): %s", e.getMessage());
        }
    }
}
