package org.openjudy.transcription.producer;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rabbitmq.client.Channel;
import com.rabbitmq.client.Connection;
import com.rabbitmq.client.ConnectionFactory;
import com.rabbitmq.client.MessageProperties;
import io.quarkus.runtime.ShutdownEvent;
import io.quarkus.runtime.StartupEvent;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import jakarta.inject.Inject;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.jboss.logging.Logger;
import org.openjudy.common.enums.MediaType;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@ApplicationScoped
public class RabbitMqTranscriptionProducer {

    private static final Logger LOG = Logger.getLogger(RabbitMqTranscriptionProducer.class);

    @ConfigProperty(name = "rabbitmq.host", defaultValue = "localhost")
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

    @ConfigProperty(name = "rabbitmq.queue", defaultValue = "judy.transcription.jobs")
    String queue;

    @ConfigProperty(name = "rabbitmq.routing-key", defaultValue = "transcription.job")
    String routingKey;

    @Inject
    ObjectMapper objectMapper;

    private Connection connection;
    private Channel channel;

    void onStart(@Observes StartupEvent ev) {
        initRabbitMq();
    }

    void onStop(@Observes ShutdownEvent ev) {
        closeRabbitMq();
    }

    private synchronized void initRabbitMq() {
        try {
            ConnectionFactory factory = new ConnectionFactory();
            factory.setHost(host);
            factory.setPort(port);
            factory.setUsername(username);
            factory.setPassword(password);
            factory.setVirtualHost(virtualHost);
            factory.setAutomaticRecoveryEnabled(true);
            factory.setNetworkRecoveryInterval(5000);

            connection = factory.newConnection("transcription-service-producer");
            channel = connection.createChannel();

            // Declare direct exchange and durable queue with DLQ settings
            channel.exchangeDeclare(exchange, "direct", true);
            channel.exchangeDeclare("judy.dlx", "direct", true);
            channel.queueDeclare("judy.transcription.dlq", true, false, false, null);
            channel.queueBind("judy.transcription.dlq", "judy.dlx", "transcription.dlq");

            Map<String, Object> args = new HashMap<>();
            args.put("x-dead-letter-exchange", "judy.dlx");
            args.put("x-dead-letter-routing-key", "transcription.dlq");
            channel.queueDeclare(queue, true, false, false, args);
            channel.queueBind(queue, exchange, routingKey);

            LOG.infof("RabbitMQ Producer initialized successfully. Bound queue '%s' to exchange '%s' [key: '%s']", queue, exchange, routingKey);
        } catch (Exception e) {
            LOG.warnf("RabbitMQ initial connection failed (%s). Will retry lazily on first publish.", e.getMessage());
        }
    }

    public synchronized void enqueueJob(UUID hearingId, String caseNumber, String storagePath, String mediaUrl, String filename, String mimeType, MediaType mediaType) {
        try {
            if (channel == null || !channel.isOpen()) {
                initRabbitMq();
            }

            if (channel == null || !channel.isOpen()) {
                throw new IllegalStateException("RabbitMQ channel is not open");
            }

            Map<String, Object> payload = new HashMap<>();
            payload.put("hearingId", hearingId.toString());
            payload.put("caseNumber", caseNumber != null ? caseNumber : "PROCESSO-UNSPECIFIED");
            payload.put("storagePath", storagePath);
            payload.put("mediaUrl", mediaUrl);
            payload.put("filename", filename);
            payload.put("mimeType", mimeType);
            payload.put("mediaType", mediaType != null ? mediaType.name() : "VIDEO");
            payload.put("retry_count", 0);
            payload.put("enqueued_at", System.currentTimeMillis());

            byte[] messageBytes = objectMapper.writeValueAsBytes(payload);

            channel.basicPublish(
                    exchange,
                    routingKey,
                    MessageProperties.PERSISTENT_TEXT_PLAIN,
                    messageBytes
            );

            LOG.infof("Enqueued transcription pipeline job for hearing %s in RabbitMQ queue '%s'", hearingId, queue);

        } catch (Exception e) {
            LOG.errorf(e, "Failed to enqueue transcription job in RabbitMQ for hearing %s", hearingId);
            throw new RuntimeException("RabbitMQ Enqueue Error: " + e.getMessage(), e);
        }
    }

    private void closeRabbitMq() {
        try {
            if (channel != null && channel.isOpen()) {
                channel.close();
            }
            if (connection != null && connection.isOpen()) {
                connection.close();
            }
        } catch (Exception ignored) {
        }
    }
}
