package org.openjudy.notification.consumer;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.rabbitmq.client.*;
import io.quarkus.runtime.ShutdownEvent;
import io.quarkus.runtime.StartupEvent;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import jakarta.inject.Inject;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.jboss.logging.Logger;
import org.openjudy.common.enums.NotificationCategory;
import org.openjudy.common.enums.NotificationPriority;
import org.openjudy.notification.service.NotificationService;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.UUID;

@ApplicationScoped
public class RabbitMqTranscriptionCompletedConsumer {

    private static final Logger LOG = Logger.getLogger(RabbitMqTranscriptionCompletedConsumer.class);

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

    @ConfigProperty(name = "rabbitmq.queue", defaultValue = "judy.transcription.completed")
    String queue;

    @ConfigProperty(name = "rabbitmq.routing-key", defaultValue = "transcription.completed")
    String routingKey;

    @Inject
    NotificationService notificationService;

    @Inject
    ObjectMapper objectMapper;

    private Connection connection;
    private Channel channel;

    void onStart(@Observes StartupEvent ev) {
        new Thread(this::initAndConsume, "rabbitmq-notification-consumer").start();
    }

    void onStop(@Observes ShutdownEvent ev) {
        closeRabbitMq();
    }

    private void initAndConsume() {
        int attempts = 0;
        while (attempts < 30) {
            try {
                ConnectionFactory factory = new ConnectionFactory();
                factory.setHost(host);
                factory.setPort(port);
                factory.setUsername(username);
                factory.setPassword(password);
                factory.setVirtualHost(virtualHost);
                factory.setAutomaticRecoveryEnabled(true);
                factory.setNetworkRecoveryInterval(5000);

                connection = factory.newConnection("notification-service-consumer");
                channel = connection.createChannel();

                channel.exchangeDeclare(exchange, "direct", true);
                channel.queueDeclare(queue, true, false, false, null);
                channel.queueBind(queue, exchange, routingKey);

                channel.basicQos(10);

                DeliverCallback deliverCallback = (consumerTag, delivery) -> {
                    String message = new String(delivery.getBody(), StandardCharsets.UTF_8);
                    try {
                        JsonNode node = objectMapper.readTree(message);

                        String hearingIdStr = node.has("hearingId") ? node.get("hearingId").asText() :
                                              node.has("hearing_id") ? node.get("hearing_id").asText() : null;
                        String caseNumber = node.has("caseNumber") ? node.get("caseNumber").asText() :
                                            node.has("case_number") ? node.get("case_number").asText() : "Processo sem número";
                        int totalSegments = node.has("totalSegments") ? node.get("totalSegments").asInt() :
                                            node.has("total_segments") ? node.get("total_segments").asInt() : 0;

                        UUID hearingId = hearingIdStr != null ? UUID.fromString(hearingIdStr) : null;

                        String title = "Transcrição de Audiência Concluída";
                        String content = String.format(
                                "A gravação da audiência do processo %s foi transcrita e diarizada com sucesso (%d intervenções identificadas). A minuta da ata já pode ser gerada.",
                                caseNumber,
                                totalSegments
                        );

                        notificationService.createNotification(
                                null, // Broadcast to judicial cabinet
                                null,
                                title,
                                content,
                                NotificationCategory.AUDIO_PROCESSING,
                                NotificationPriority.NORMAL,
                                hearingId != null ? "/hearings/" + hearingId : "/hearings",
                                hearingId
                        );

                        channel.basicAck(delivery.getEnvelope().getDeliveryTag(), false);
                        LOG.infof("Processed RabbitMQ transcription completed notification for process %s", caseNumber);

                    } catch (Exception e) {
                        LOG.errorf(e, "Error handling RabbitMQ transcription completed message: %s", message);
                        channel.basicAck(delivery.getEnvelope().getDeliveryTag(), false);
                    }
                };

                channel.basicConsume(queue, false, deliverCallback, consumerTag -> {});
                LOG.infof("RabbitMQ Notification Consumer is listening on queue '%s' (exchange '%s', key '%s')", queue, exchange, routingKey);
                break;

            } catch (Exception e) {
                attempts++;
                LOG.warnf("RabbitMQ Notification connection attempt %d failed (%s). Retrying in 4s...", attempts, e.getMessage());
                try {
                    Thread.sleep(4000);
                } catch (InterruptedException ignored) {
                    break;
                }
            }
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
        } catch (Exception ignored) {}
    }
}
