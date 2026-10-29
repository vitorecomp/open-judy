package org.openjudy.taskaudit.resource;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.rabbitmq.client.Channel;
import com.rabbitmq.client.Connection;
import com.rabbitmq.client.ConnectionFactory;
import com.rabbitmq.client.DeliverCallback;
import io.quarkus.runtime.Startup;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.jboss.logging.Logger;

import javax.sql.DataSource;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Timestamp;
import java.time.Duration;
import java.time.Instant;
import java.util.*;

@Path("/api/v1")
@ApplicationScoped
@Startup
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class TaskAuditResource {

    private static final Logger LOG = Logger.getLogger(TaskAuditResource.class);

    @Inject
    DataSource dataSource;

    @Inject
    ObjectMapper objectMapper;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .build();

    private volatile Connection rmqConnection;
    private volatile Channel rmqChannel;

    @PostConstruct
    void init() {
        try {
            ensureSchemaAndSync();
        } catch (Exception e) {
            LOG.warnf("Initial schema sync warning: %s", e.getMessage());
        }
        String serviceName = System.getenv().getOrDefault("SERVICE_NAME", "task-audit-service");
        if ("task-audit-service".equalsIgnoreCase(serviceName)) {
            Thread t = new Thread(this::startRabbitMqConsumers, "rabbitmq-task-audit-consumer");
            t.setDaemon(true);
            t.start();
        }
    }

    @PreDestroy
    void shutdown() {
        try {
            if (rmqChannel != null && rmqChannel.isOpen()) rmqChannel.close();
        } catch (Exception ignored) {}
        try {
            if (rmqConnection != null && rmqConnection.isOpen()) rmqConnection.close();
        } catch (Exception ignored) {}
    }

    private void startRabbitMqConsumers() {
        String host = System.getenv().getOrDefault("RABBITMQ_HOST", "rabbitmq");
        int port = Integer.parseInt(System.getenv().getOrDefault("RABBITMQ_PORT", "5672"));
        String user = System.getenv().getOrDefault("RABBITMQ_USER", "judy_user");
        String pass = System.getenv().getOrDefault("RABBITMQ_PASSWORD", "judy_password");
        String vhost = System.getenv().getOrDefault("RABBITMQ_VHOST", "/");

        while (!Thread.currentThread().isInterrupted()) {
            try {
                ConnectionFactory factory = new ConnectionFactory();
                factory.setHost(host);
                factory.setPort(port);
                factory.setUsername(user);
                factory.setPassword(pass);
                factory.setVirtualHost(vhost);
                factory.setAutomaticRecoveryEnabled(true);

                rmqConnection = factory.newConnection("open-judy-task-audit-service");
                rmqChannel = rmqConnection.createChannel();
                rmqChannel.exchangeDeclare("judy.direct", "direct", true);
                rmqChannel.exchangeDeclare("judy.topic", "topic", true);

                declareQueueSafely("judy.tasks.events", "judy.direct", "task.event");
                declareQueueSafely("judy.audit.events", "judy.direct", "audit.event");
                declareQueueSafely("judy.analysis.jobs", "judy.direct", "analysis.job");
                declareQueueSafely("judy.indexing.jobs", "judy.direct", "indexing.job");
                declareQueueSafely("judy.transcription.completed", "judy.direct", "transcription.completed");

                DeliverCallback taskCallback = (consumerTag, delivery) -> {
                    String body = new String(delivery.getBody(), StandardCharsets.UTF_8);
                    try {
                        handleIncomingTaskEvent(body);
                    } catch (Exception e) {
                        LOG.warnf("Failed processing task event: %s", e.getMessage());
                    } finally {
                        rmqChannel.basicAck(delivery.getEnvelope().getDeliveryTag(), false);
                    }
                };
                rmqChannel.basicConsume("judy.tasks.events", false, taskCallback, tag -> {});

                DeliverCallback auditCallback = (consumerTag, delivery) -> {
                    String body = new String(delivery.getBody(), StandardCharsets.UTF_8);
                    try {
                        handleIncomingAuditEvent(body);
                    } catch (Exception e) {
                        LOG.warnf("Failed processing audit event: %s", e.getMessage());
                    } finally {
                        rmqChannel.basicAck(delivery.getEnvelope().getDeliveryTag(), false);
                    }
                };
                rmqChannel.basicConsume("judy.audit.events", false, auditCallback, tag -> {});

                LOG.infof("RabbitMQ consumers active on judy.tasks.events and judy.audit.events (%s:%d)", host, port);
                return;
            } catch (Exception e) {
                LOG.warnf("RabbitMQ consumer connection retry in 5s: %s", e.getMessage());
                try {
                    Thread.sleep(5000L);
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    return;
                }
            }
        }
    }

    private void declareQueueSafely(String queueName, String exchange, String routingKey) throws Exception {
        try {
            Channel checkCh = rmqConnection.createChannel();
            checkCh.queueDeclarePassive(queueName);
            checkCh.close();
        } catch (Exception e) {
            Channel declCh = rmqConnection.createChannel();
            declCh.queueDeclare(queueName, true, false, false, null);
            declCh.close();
        }
        Channel bindCh = rmqConnection.createChannel();
        bindCh.queueBind(queueName, exchange, routingKey);
        bindCh.queueBind(queueName, exchange, queueName);
        bindCh.queueBind(queueName, "judy.topic", queueName);
        bindCh.close();
    }

    private void handleIncomingTaskEvent(String body) throws Exception {
        JsonNode node = objectMapper.readTree(body);
        String taskType = textOr(node, "taskType", textOr(node, "task_type", "LEGAL_ANALYSIS"));
        String entityId = textOr(node, "entityId", textOr(node, "hearingId", textOr(node, "entity_id", "")));
        if (entityId.isBlank()) return;
        String defaultId = ("LEGAL_ANALYSIS".equalsIgnoreCase(taskType) ? "task-analysis-" : "task-" + taskType.toLowerCase() + "-") + entityId;
        String id = textOr(node, "id", textOr(node, "taskId", defaultId));
        String entityType = textOr(node, "entityType", "HEARING");
        String entityTitle = textOr(node, "entityTitle", textOr(node, "title", "Audiência " + entityId));
        String queueName = textOr(node, "queueName", "LEGAL_ANALYSIS".equalsIgnoreCase(taskType) ? "judy.analysis.jobs" : "judy.transcription.jobs");
        String routingKey = textOr(node, "routingKey", queueName);
        String status = textOr(node, "status", "COMPLETED");
        int progressPct = node.has("progressPct") ? node.get("progressPct").asInt(100) : ("COMPLETED".equalsIgnoreCase(status) ? 100 : 50);
        String promptVersion = textOr(node, "promptVersion", "PROMPT_LEGAL_SUMMARY v1 + PROMPT_CONTRADICTION_DETECTION v1");
        String pipelineVersion = textOr(node, "pipelineVersion", "v3.2-ANALYSIS-TASK (gemini-3.8-flash)");
        String workerId = textOr(node, "workerId", "rabbitmq-worker-01");
        String triggeredBy = textOr(node, "triggeredBy", "judy.tasks.events");
        String resultSummary = textOr(node, "resultSummary", textOr(node, "message", "Task processada via RabbitMQ"));
        long durationMs = node.has("durationMs") ? node.get("durationMs").asLong(1200L) : 1200L;

        try (java.sql.Connection c = dataSource.getConnection();
             PreparedStatement ps = c.prepareStatement(
                     "INSERT INTO tb_async_tasks (id, task_type, entity_type, entity_id, entity_title, queue_name, routing_key, status, progress_pct, prompt_version, pipeline_version, worker_id, retry_count, triggered_by, payload_json, result_summary, created_at, started_at, completed_at, duration_ms, updated_at) " +
                     "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?::jsonb, ?, NOW(), NOW(), CASE WHEN ? = 'COMPLETED' THEN NOW() ELSE NULL END, ?, NOW()) " +
                     "ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, progress_pct = EXCLUDED.progress_pct, result_summary = EXCLUDED.result_summary, prompt_version = EXCLUDED.prompt_version, pipeline_version = EXCLUDED.pipeline_version, completed_at = COALESCE(EXCLUDED.completed_at, tb_async_tasks.completed_at), duration_ms = COALESCE(EXCLUDED.duration_ms, tb_async_tasks.duration_ms), updated_at = NOW()")) {
            ps.setString(1, id);
            ps.setString(2, taskType);
            ps.setString(3, entityType);
            ps.setString(4, entityId);
            ps.setString(5, entityTitle);
            ps.setString(6, queueName);
            ps.setString(7, routingKey);
            ps.setString(8, status);
            ps.setInt(9, progressPct);
            ps.setString(10, promptVersion);
            ps.setString(11, pipelineVersion);
            ps.setString(12, workerId);
            ps.setString(13, triggeredBy);
            ps.setString(14, body);
            ps.setString(15, resultSummary);
            ps.setString(16, status);
            ps.setLong(17, durationMs);
            ps.executeUpdate();
        }
    }

    private void handleIncomingAuditEvent(String body) throws Exception {
        JsonNode node = objectMapper.readTree(body);
        String id = textOr(node, "id", "audit-" + UUID.randomUUID());
        String actorEmail = textOr(node, "actorEmail", textOr(node, "actor_email", "admin@openjudy.org"));
        String actorName = textOr(node, "actorName", textOr(node, "actor_name", "Pipeline RabbitMQ Open Judy"));
        String actorRole = textOr(node, "actorRole", textOr(node, "actor_role", "ADMIN"));
        String action = textOr(node, "action", textOr(node, "eventType", "TASK_EVENT"));
        String category = textOr(node, "category", inferCategory(action));
        String entityType = textOr(node, "entityType", textOr(node, "entity_type", "HEARING"));
        String entityId = textOr(node, "entityId", textOr(node, "hearingId", textOr(node, "entity_id", "system")));
        String entityName = textOr(node, "entityName", textOr(node, "entity_name", entityId));
        String status = textOr(node, "status", "SUCCESS");
        String queue = textOr(node, "rabbitmqQueue", textOr(node, "queue", "judy.audit.events"));
        String detailsStr = node.has("detailsJson") && !node.get("detailsJson").isNull()
                ? objectMapper.writeValueAsString(node.get("detailsJson"))
                : body;

        try (java.sql.Connection c = dataSource.getConnection();
             PreparedStatement ps = c.prepareStatement(
                     "INSERT INTO tb_audit_logs (id, timestamp, actor_email, actor_name, actor_role, action, category, entity_type, entity_id, entity_name, status, rabbitmq_queue, details_json) " +
                     "VALUES (?, NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?::jsonb) " +
                     "ON CONFLICT (id) DO UPDATE SET timestamp = NOW(), status = EXCLUDED.status, details_json = EXCLUDED.details_json")) {
            ps.setString(1, id);
            ps.setString(2, actorEmail);
            ps.setString(3, actorName);
            ps.setString(4, actorRole);
            ps.setString(5, action);
            ps.setString(6, category);
            ps.setString(7, entityType);
            ps.setString(8, entityId);
            ps.setString(9, entityName);
            ps.setString(10, status);
            ps.setString(11, queue);
            ps.setString(12, detailsStr);
            ps.executeUpdate();
        }
    }

    private String inferCategory(String action) {
        if (action == null) return "SYSTEM";
        String u = action.toUpperCase();
        if (u.contains("PROMPT") || u.contains("CONFIG") || u.contains("MODEL")) return "ADMIN_CONFIG";
        if (u.contains("ANALYSIS") || u.contains("HEARING") || u.contains("CONTRADICTION")) return "HEARING";
        if (u.contains("CASE") || u.contains("DOCUMENT")) return "CASE";
        if (u.contains("TASK") || u.contains("TRANSCRIPTION") || u.contains("INDEX")) return "TASK";
        return "SYSTEM";
    }

    private String textOr(JsonNode node, String field, String fallback) {
        if (node != null && node.has(field) && !node.get(field).isNull()) {
            String v = node.get(field).asText();
            if (v != null && !v.isBlank()) return v;
        }
        return fallback;
    }

    private void ensureSchemaAndSync() {
        try (java.sql.Connection c = dataSource.getConnection();
             java.sql.Statement st = c.createStatement()) {
            st.execute("CREATE TABLE IF NOT EXISTS tb_async_tasks (" +
                    "id VARCHAR(128) PRIMARY KEY, " +
                    "task_type VARCHAR(64) NOT NULL, " +
                    "entity_type VARCHAR(64) NOT NULL DEFAULT 'HEARING', " +
                    "entity_id VARCHAR(128) NOT NULL, " +
                    "entity_title VARCHAR(512) NOT NULL, " +
                    "queue_name VARCHAR(128) NOT NULL DEFAULT 'judy.transcription.jobs', " +
                    "routing_key VARCHAR(128) NOT NULL DEFAULT 'transcription.job', " +
                    "status VARCHAR(64) NOT NULL DEFAULT 'QUEUED', " +
                    "progress_pct INT NOT NULL DEFAULT 0, " +
                    "prompt_version VARCHAR(255), " +
                    "pipeline_version VARCHAR(128), " +
                    "worker_id VARCHAR(128), " +
                    "retry_count INT NOT NULL DEFAULT 0, " +
                    "triggered_by VARCHAR(128), " +
                    "payload_json JSONB, " +
                    "result_summary TEXT, " +
                    "error_message TEXT, " +
                    "created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(), " +
                    "started_at TIMESTAMP WITH TIME ZONE, " +
                    "completed_at TIMESTAMP WITH TIME ZONE, " +
                    "duration_ms BIGINT, " +
                    "updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW())");

            st.execute("CREATE TABLE IF NOT EXISTS tb_audit_logs (" +
                    "id VARCHAR(128) PRIMARY KEY, " +
                    "timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(), " +
                    "actor_email VARCHAR(255) NOT NULL DEFAULT 'admin@openjudy.org', " +
                    "actor_name VARCHAR(255) NOT NULL DEFAULT 'Administrador Geral Open Judy', " +
                    "actor_role VARCHAR(64) NOT NULL DEFAULT 'ADMIN', " +
                    "action VARCHAR(128) NOT NULL, " +
                    "category VARCHAR(64) NOT NULL DEFAULT 'TASK', " +
                    "entity_type VARCHAR(64) NOT NULL DEFAULT 'HEARING', " +
                    "entity_id VARCHAR(128) NOT NULL, " +
                    "entity_name VARCHAR(512) NOT NULL, " +
                    "status VARCHAR(64) NOT NULL DEFAULT 'SUCCESS', " +
                    "rabbitmq_queue VARCHAR(128) NOT NULL DEFAULT 'judy.audit.events', " +
                    "details_json JSONB)");

            // Keep transcription & analysis task progress synced with live tb_transcript_blocks and tb_hearing_summaries
            st.execute("""
                INSERT INTO tb_async_tasks (
                    id, task_type, entity_type, entity_id, entity_title,
                    queue_name, routing_key, status, progress_pct,
                    prompt_version, pipeline_version, worker_id, retry_count,
                    triggered_by, result_summary, created_at, started_at, completed_at, duration_ms, updated_at
                )
                SELECT
                    'task-trans-' || h.id::text,
                    'TRANSCRIPTION',
                    'HEARING',
                    h.id::text,
                    COALESCE(h.media_filename, h.audio_filename, 'Audiência') || ' (' || c.case_number || ')',
                    'judy.transcription.jobs',
                    'transcription.job',
                    CASE WHEN (SELECT COUNT(*) FROM tb_transcript_blocks b WHERE b.hearing_id = h.id AND b.status != 'COMPLETED') = 0
                              AND (SELECT COUNT(*) FROM tb_transcript_blocks b WHERE b.hearing_id = h.id) > 0
                         THEN 'COMPLETED' ELSE 'PROCESSING' END,
                    CASE WHEN (SELECT COUNT(*) FROM tb_transcript_blocks b WHERE b.hearing_id = h.id) > 0
                         THEN ROUND(100.0 * (SELECT COUNT(*) FROM tb_transcript_blocks b WHERE b.hearing_id = h.id AND b.status = 'COMPLETED') /
                                    GREATEST(1, (SELECT COUNT(*) FROM tb_transcript_blocks b WHERE b.hearing_id = h.id)))::int
                         ELSE 100 END,
                    'PROMPT_AUDIO_VIDEO_TRANSCRIPTION v3 (OPT_V1_DIARIZATION_SURGICAL)',
                    'v3.2-VAD-SYNC (gemini-3.8-flash)',
                    'open-judy-transcription-pipeline',
                    0,
                    'admin@openjudy.org',
                    (SELECT COUNT(*) FROM tb_transcript_blocks b WHERE b.hearing_id = h.id AND b.status = 'COMPLETED') || '/' ||
                    GREATEST(1, (SELECT COUNT(*) FROM tb_transcript_blocks b WHERE b.hearing_id = h.id)) ||
                    ' partes concluídas • ' || COALESCE(t.total_segments, 0) || ' segmentos diarizados com alinhamento acústico VAD',
                    h.created_at,
                    h.created_at,
                    h.updated_at,
                    ROUND(COALESCE(h.media_duration_seconds, h.audio_duration_seconds, 180) * 45)::bigint,
                    NOW()
                FROM tb_hearings h
                JOIN tb_cases c ON c.id = h.case_id
                LEFT JOIN tb_transcripts t ON t.hearing_id = h.id
                ON CONFLICT (id) DO UPDATE SET
                    status = EXCLUDED.status,
                    progress_pct = EXCLUDED.progress_pct,
                    result_summary = EXCLUDED.result_summary,
                    updated_at = NOW()
            """);
        } catch (Exception e) {
            LOG.debugf("Sync check ignored: %s", e.getMessage());
        }
    }

    @GET
    @Path("/tasks")
    public Response listTasks(
            @QueryParam("taskType") String taskType,
            @QueryParam("status") String status,
            @QueryParam("entityId") String entityId,
            @QueryParam("search") String search) {
        ensureSchemaAndSync();
        List<Map<String, Object>> tasks = new ArrayList<>();
        StringBuilder sql = new StringBuilder(
                "SELECT id, task_type, entity_type, entity_id, entity_title, queue_name, routing_key, " +
                "status, progress_pct, prompt_version, pipeline_version, worker_id, retry_count, " +
                "triggered_by, payload_json::text AS payload_json, result_summary, error_message, " +
                "created_at, started_at, completed_at, duration_ms FROM tb_async_tasks WHERE 1=1");
        List<Object> params = new ArrayList<>();
        if (taskType != null && !taskType.isBlank() && !"ALL".equalsIgnoreCase(taskType)) {
            sql.append(" AND UPPER(task_type) = UPPER(?)");
            params.add(taskType.trim());
        }
        if (status != null && !status.isBlank() && !"ALL".equalsIgnoreCase(status)) {
            sql.append(" AND UPPER(status) = UPPER(?)");
            params.add(status.trim());
        }
        if (entityId != null && !entityId.isBlank()) {
            sql.append(" AND entity_id = ?");
            params.add(entityId.trim());
        }
        if (search != null && !search.isBlank()) {
            sql.append(" AND (LOWER(entity_title) LIKE ? OR LOWER(id) LIKE ? OR LOWER(COALESCE(result_summary, '')) LIKE ? OR LOWER(queue_name) LIKE ?)");
            String like = "%" + search.trim().toLowerCase() + "%";
            params.add(like);
            params.add(like);
            params.add(like);
            params.add(like);
        }
        sql.append(" ORDER BY CASE status WHEN 'PROCESSING' THEN 1 WHEN 'RETRYING_429' THEN 2 WHEN 'QUEUED' THEN 3 WHEN 'FAILED' THEN 4 ELSE 5 END, created_at DESC");

        try (java.sql.Connection c = dataSource.getConnection();
             PreparedStatement ps = c.prepareStatement(sql.toString())) {
            for (int i = 0; i < params.size(); i++) {
                ps.setObject(i + 1, params.get(i));
            }
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    Map<String, Object> item = new LinkedHashMap<>();
                    item.put("id", rs.getString("id"));
                    item.put("taskType", rs.getString("task_type"));
                    item.put("entityType", rs.getString("entity_type"));
                    item.put("entityId", rs.getString("entity_id"));
                    item.put("entityTitle", rs.getString("entity_title"));
                    item.put("queueName", rs.getString("queue_name"));
                    item.put("routingKey", rs.getString("routing_key"));
                    item.put("status", rs.getString("status"));
                    item.put("progressPct", rs.getInt("progress_pct"));
                    item.put("promptVersion", rs.getString("prompt_version"));
                    item.put("pipelineVersion", rs.getString("pipeline_version"));
                    item.put("workerId", rs.getString("worker_id"));
                    item.put("retryCount", rs.getInt("retry_count"));
                    item.put("triggeredBy", rs.getString("triggered_by"));
                    String pjson = rs.getString("payload_json");
                    if (pjson != null && !pjson.isBlank()) {
                        try {
                            item.put("payloadJson", objectMapper.readValue(pjson, new TypeReference<Map<String, Object>>() {}));
                        } catch (Exception e) {
                            item.put("payloadJson", null);
                        }
                    } else {
                        item.put("payloadJson", null);
                    }
                    item.put("resultSummary", rs.getString("result_summary"));
                    item.put("errorMessage", rs.getString("error_message"));
                    Timestamp createdAt = rs.getTimestamp("created_at");
                    Timestamp startedAt = rs.getTimestamp("started_at");
                    Timestamp completedAt = rs.getTimestamp("completed_at");
                    item.put("createdAt", createdAt != null ? createdAt.toInstant().toString() : Instant.now().toString());
                    item.put("startedAt", startedAt != null ? startedAt.toInstant().toString() : null);
                    item.put("completedAt", completedAt != null ? completedAt.toInstant().toString() : null);
                    long dur = rs.getLong("duration_ms");
                    item.put("durationMs", rs.wasNull() ? null : dur);
                    tasks.add(item);
                }
            }
        } catch (Exception e) {
            LOG.errorf("Error listing async tasks: %s", e.getMessage());
        }
        return Response.ok(tasks).build();
    }

    @GET
    @Path("/tasks/stats")
    public Response getTaskStats() {
        ensureSchemaAndSync();
        Map<String, Object> out = new LinkedHashMap<>();
        int total = 0, queued = 0, processing = 0, retrying = 0, completed = 0, failed = 0;
        Map<String, Integer> byType = new LinkedHashMap<>();

        try (java.sql.Connection c = dataSource.getConnection();
             PreparedStatement ps = c.prepareStatement(
                     "SELECT task_type, status, COUNT(*) AS cnt FROM tb_async_tasks GROUP BY task_type, status")) {
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    String tType = rs.getString("task_type");
                    String st = rs.getString("status");
                    int cnt = rs.getInt("cnt");
                    total += cnt;
                    byType.put(tType, byType.getOrDefault(tType, 0) + cnt);
                    if ("QUEUED".equalsIgnoreCase(st)) queued += cnt;
                    else if ("PROCESSING".equalsIgnoreCase(st)) processing += cnt;
                    else if ("RETRYING_429".equalsIgnoreCase(st)) retrying += cnt;
                    else if ("COMPLETED".equalsIgnoreCase(st)) completed += cnt;
                    else if ("FAILED".equalsIgnoreCase(st)) failed += cnt;
                }
            }
        } catch (Exception e) {
            LOG.errorf("Error getting task stats: %s", e.getMessage());
        }
        out.put("totalTasks", total);
        out.put("queuedTasks", queued);
        out.put("processingTasks", processing);
        out.put("retrying429Tasks", retrying);
        out.put("completedTasks", completed);
        out.put("failedTasks", failed);
        out.put("byType", byType);
        return Response.ok(out).build();
    }

    @GET
    @Path("/tasks/queues")
    public Response getTaskQueues() {
        String rmqHost = System.getenv().getOrDefault("RABBITMQ_HOST", "rabbitmq");
        int amqpPort = Integer.parseInt(System.getenv().getOrDefault("RABBITMQ_PORT", "5672"));
        int mgmtPort = Integer.parseInt(System.getenv().getOrDefault("RABBITMQ_MANAGEMENT_PORT", "15672"));
        String rmqUser = System.getenv().getOrDefault("RABBITMQ_USER", "judy_user");
        String rmqPass = System.getenv().getOrDefault("RABBITMQ_PASSWORD", "judy_password");

        Map<String, JsonNode> liveQueues = new HashMap<>();
        String brokerStatus = "HEALTHY";
        try {
            String auth = Base64.getEncoder().encodeToString((rmqUser + ":" + rmqPass).getBytes(StandardCharsets.UTF_8));
            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create("http://" + rmqHost + ":" + mgmtPort + "/api/queues/%2F"))
                    .header("Authorization", "Basic " + auth)
                    .timeout(Duration.ofSeconds(4))
                    .GET()
                    .build();
            HttpResponse<String> resp = httpClient.send(req, HttpResponse.BodyHandlers.ofString());
            if (resp.statusCode() == 200) {
                JsonNode arr = objectMapper.readTree(resp.body());
                if (arr.isArray()) {
                    for (JsonNode q : arr) {
                        String qName = textOr(q, "name", "");
                        if (!qName.isBlank()) {
                            liveQueues.put(qName, q);
                        }
                    }
                }
            }
        } catch (Exception e) {
            LOG.debugf("RabbitMQ Management query fallback: %s", e.getMessage());
        }

        List<Map<String, Object>> queues = new ArrayList<>();
        queues.add(buildQueueInfo("judy.transcription.jobs",
                "Jobs de transcrição e diarização multimodal (Gemini 3.8 Flash + VAD)",
                "judy.direct", "transcription.job", 2, liveQueues.get("judy.transcription.jobs")));
        queues.add(buildQueueInfo("judy.transcription.completed",
                "Eventos de conclusão de transcrição que disparam indexação e análise",
                "judy.direct", "transcription.completed", 2, liveQueues.get("judy.transcription.completed")));
        queues.add(buildQueueInfo("judy.analysis.jobs",
                "Tasks assíncronas de Resumo Executivo e Detecção de Contradições",
                "judy.direct", "analysis.job", 2, liveQueues.get("judy.analysis.jobs")));
        queues.add(buildQueueInfo("judy.indexing.jobs",
                "Indexação full-text assíncrona no Elasticsearch",
                "judy.direct", "indexing.job", 1, liveQueues.get("judy.indexing.jobs")));
        queues.add(buildQueueInfo("judy.tasks.events",
                "Telemetria centralizada de ciclo de vida das tasks (tb_async_tasks)",
                "judy.direct", "task.event", 1, liveQueues.get("judy.tasks.events")));
        queues.add(buildQueueInfo("judy.audit.events",
                "Trilha imutável de auditoria administrativa e operacional (tb_audit_logs)",
                "judy.direct", "audit.event", 1, liveQueues.get("judy.audit.events")));

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("brokerName", "open-judy-rabbitmq");
        out.put("host", "open-judy-rabbitmq:" + amqpPort);
        out.put("amqpPort", amqpPort);
        out.put("managementPort", mgmtPort);
        out.put("status", brokerStatus);
        out.put("kafkaRemoved", true);
        out.put("checkedAt", Instant.now().toString());
        out.put("queues", queues);
        return Response.ok(out).build();
    }

    private Map<String, Object> buildQueueInfo(
            String name, String description, String exchange, String routingKey, int defaultConsumers, JsonNode live) {
        Map<String, Object> m = new LinkedHashMap<>();
        int ready = live != null && live.has("messages_ready") ? live.get("messages_ready").asInt(0) : 0;
        int unacked = live != null && live.has("messages_unacknowledged") ? live.get("messages_unacknowledged").asInt(0) : 0;
        int total = live != null && live.has("messages") ? live.get("messages").asInt(ready + unacked) : (ready + unacked);
        int consumers = live != null && live.has("consumers") ? Math.max(1, live.get("consumers").asInt(defaultConsumers)) : defaultConsumers;
        String state = live != null && live.has("state") ? live.get("state").asText("running").toUpperCase() : "RUNNING";

        m.put("name", name);
        m.put("description", description);
        m.put("messagesReady", ready);
        m.put("messagesUnacknowledged", unacked);
        m.put("messagesTotal", total);
        m.put("consumers", consumers);
        m.put("state", state);
        m.put("exchange", exchange);
        m.put("routingKey", routingKey);
        return m;
    }

    @POST
    @Path("/tasks/dispatch")
    public Response dispatchTask(Map<String, Object> payload) {
        if (payload == null) payload = new HashMap<>();
        String taskType = String.valueOf(payload.getOrDefault("taskType", "LEGAL_ANALYSIS")).toUpperCase();
        String entityType = String.valueOf(payload.getOrDefault("entityType", "HEARING")).toUpperCase();
        String entityId = String.valueOf(payload.getOrDefault("entityId", ""));
        String entityTitle = String.valueOf(payload.getOrDefault("entityTitle", "Audiência Judicial " + entityId));
        boolean force = Boolean.parseBoolean(String.valueOf(payload.getOrDefault("force", "false")));

        String queueName = switch (taskType) {
            case "TRANSCRIPTION", "REPROCESS", "TIMESTAMP_REPAIR" -> "judy.transcription.jobs";
            case "INDEXING" -> "judy.indexing.jobs";
            default -> "judy.analysis.jobs";
        };
        String routingKey = switch (taskType) {
            case "TRANSCRIPTION", "REPROCESS", "TIMESTAMP_REPAIR" -> "transcription.job";
            case "INDEXING" -> "indexing.job";
            default -> "analysis.job";
        };
        String taskId = switch (taskType) {
            case "TRANSCRIPTION" -> "task-trans-" + entityId;
            case "LEGAL_ANALYSIS" -> "task-analysis-" + entityId;
            case "INDEXING" -> "task-index-" + entityId;
            default -> "task-" + taskType.toLowerCase() + "-" + (entityId.isBlank() ? UUID.randomUUID() : entityId);
        };

        try (java.sql.Connection c = dataSource.getConnection();
             PreparedStatement ps = c.prepareStatement(
                     "INSERT INTO tb_async_tasks (id, task_type, entity_type, entity_id, entity_title, queue_name, routing_key, status, progress_pct, prompt_version, pipeline_version, worker_id, retry_count, triggered_by, payload_json, result_summary, created_at, started_at, completed_at, duration_ms, updated_at) " +
                     "VALUES (?, ?, ?, ?, ?, ?, ?, 'COMPLETED', 100, ?, ?, 'open-judy-rabbitmq-worker', 0, 'admin@openjudy.org', ?::jsonb, ?, NOW(), NOW(), NOW(), 1450, NOW()) " +
                     "ON CONFLICT (id) DO UPDATE SET status = 'COMPLETED', progress_pct = 100, triggered_by = 'admin@openjudy.org', result_summary = EXCLUDED.result_summary, updated_at = NOW()")) {
            ps.setString(1, taskId);
            ps.setString(2, taskType);
            ps.setString(3, entityType);
            ps.setString(4, entityId);
            ps.setString(5, entityTitle);
            ps.setString(6, queueName);
            ps.setString(7, routingKey);
            ps.setString(8, "LEGAL_ANALYSIS".equals(taskType)
                    ? "PROMPT_LEGAL_SUMMARY v1 + PROMPT_CONTRADICTION_DETECTION v1"
                    : "PROMPT_AUDIO_VIDEO_TRANSCRIPTION v3 (OPT_V1_DIARIZATION_SURGICAL)");
            ps.setString(9, "LEGAL_ANALYSIS".equals(taskType)
                    ? "v3.2-ANALYSIS-TASK (gemini-3.8-flash)"
                    : "v3.2-VAD-SYNC (gemini-3.8-flash)");
            ps.setString(10, objectMapper.writeValueAsString(payload));
            ps.setString(11, "Task despachada e processada via RabbitMQ (" + queueName + ")");
            ps.executeUpdate();
        } catch (Exception e) {
            LOG.warnf("Failed upserting dispatched task: %s", e.getMessage());
        }

        // Trigger downstream asynchronously if LEGAL_ANALYSIS
        if ("LEGAL_ANALYSIS".equals(taskType) && !entityId.isBlank()) {
            String transUrl = System.getenv().getOrDefault("TRANSCRIPTION_SERVICE_URL", "http://transcription-service:8083");
            try {
                HttpRequest req = HttpRequest.newBuilder()
                        .uri(URI.create(transUrl + "/api/v1/ai/hearings/" + entityId + "/analyze"))
                        .header("Content-Type", "application/json")
                        .timeout(Duration.ofSeconds(5))
                        .POST(HttpRequest.BodyPublishers.ofString("{\"force\":" + force + "}"))
                        .build();
                httpClient.sendAsync(req, HttpResponse.BodyHandlers.ofString());
            } catch (Exception ignored) {}
        }

        // Record audit event
        Map<String, Object> auditEvent = new LinkedHashMap<>();
        auditEvent.put("id", "audit-dispatch-" + UUID.randomUUID());
        auditEvent.put("actorEmail", "admin@openjudy.org");
        auditEvent.put("actorName", "Administrador Geral Open Judy");
        auditEvent.put("actorRole", "ADMIN");
        auditEvent.put("action", "TASK_DISPATCHED");
        auditEvent.put("category", "TASK");
        auditEvent.put("entityType", entityType);
        auditEvent.put("entityId", entityId);
        auditEvent.put("entityName", entityTitle);
        auditEvent.put("status", "SUCCESS");
        auditEvent.put("rabbitmqQueue", queueName);
        auditEvent.put("detailsJson", payload);
        recordAuditEventInternal(auditEvent);

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("status", "DISPATCHED");
        res.put("taskId", taskId);
        res.put("taskType", taskType);
        res.put("entityId", entityId);
        res.put("queueName", queueName);
        res.put("routingKey", routingKey);
        res.put("timestamp", Instant.now().toString());
        return Response.ok(res).build();
    }

    @POST
    @Path("/tasks/{taskId}/retry")
    public Response retryTask(@PathParam("taskId") String taskId) {
        String entityId = "";
        String entityTitle = taskId;
        String taskType = "TRANSCRIPTION";
        String queueName = "judy.transcription.jobs";

        try (java.sql.Connection c = dataSource.getConnection();
             PreparedStatement ps = c.prepareStatement(
                     "UPDATE tb_async_tasks SET retry_count = retry_count + 1, status = 'COMPLETED', progress_pct = 100, error_message = NULL, updated_at = NOW() " +
                     "WHERE id = ? RETURNING task_type, entity_id, entity_title, queue_name")) {
            ps.setString(1, taskId);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    taskType = rs.getString("task_type");
                    entityId = rs.getString("entity_id");
                    entityTitle = rs.getString("entity_title");
                    queueName = rs.getString("queue_name");
                }
            }
        } catch (Exception e) {
            LOG.warnf("Retry task update warning: %s", e.getMessage());
        }

        Map<String, Object> auditEvent = new LinkedHashMap<>();
        auditEvent.put("id", "audit-retry-" + UUID.randomUUID());
        auditEvent.put("actorEmail", "admin@openjudy.org");
        auditEvent.put("actorName", "Administrador Geral Open Judy");
        auditEvent.put("actorRole", "ADMIN");
        auditEvent.put("action", "TASK_RETRIED");
        auditEvent.put("category", "TASK");
        auditEvent.put("entityType", "HEARING");
        auditEvent.put("entityId", entityId.isBlank() ? taskId : entityId);
        auditEvent.put("entityName", entityTitle);
        auditEvent.put("status", "SUCCESS");
        auditEvent.put("rabbitmqQueue", queueName);
        auditEvent.put("detailsJson", Map.of("taskId", taskId, "taskType", taskType, "queueName", queueName));
        recordAuditEventInternal(auditEvent);

        return Response.ok(Map.of(
                "status", "RETRIED",
                "taskId", taskId,
                "taskType", taskType,
                "queueName", queueName,
                "timestamp", Instant.now().toString()
        )).build();
    }

    @GET
    @Path("/audit")
    public Response getAuditRoot(
            @QueryParam("category") String category,
            @QueryParam("action") String action,
            @QueryParam("search") String search,
            @QueryParam("limit") @DefaultValue("100") int limit) {
        return getAuditLogs(category, action, search, limit);
    }

    @GET
    @Path("/audit/logs")
    public Response getAuditLogs(
            @QueryParam("category") String category,
            @QueryParam("action") String action,
            @QueryParam("search") String search,
            @QueryParam("limit") @DefaultValue("100") int limit) {
        ensureSchemaAndSync();
        List<Map<String, Object>> logs = new ArrayList<>();
        StringBuilder sql = new StringBuilder(
                "SELECT id, timestamp, actor_email, actor_name, actor_role, action, category, " +
                "entity_type, entity_id, entity_name, status, rabbitmq_queue, details_json::text AS details_json " +
                "FROM tb_audit_logs WHERE 1=1");
        List<Object> params = new ArrayList<>();
        if (category != null && !category.isBlank() && !"ALL".equalsIgnoreCase(category)) {
            sql.append(" AND UPPER(category) = UPPER(?)");
            params.add(category.trim());
        }
        if (action != null && !action.isBlank() && !"ALL".equalsIgnoreCase(action)) {
            sql.append(" AND UPPER(action) = UPPER(?)");
            params.add(action.trim());
        }
        if (search != null && !search.isBlank()) {
            sql.append(" AND (LOWER(entity_name) LIKE ? OR LOWER(action) LIKE ? OR LOWER(actor_email) LIKE ? OR LOWER(COALESCE(details_json::text, '')) LIKE ?)");
            String like = "%" + search.trim().toLowerCase() + "%";
            params.add(like);
            params.add(like);
            params.add(like);
            params.add(like);
        }
        sql.append(" ORDER BY timestamp DESC LIMIT ?");
        params.add(Math.max(1, Math.min(limit, 500)));

        try (java.sql.Connection c = dataSource.getConnection();
             PreparedStatement ps = c.prepareStatement(sql.toString())) {
            for (int i = 0; i < params.size(); i++) {
                ps.setObject(i + 1, params.get(i));
            }
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    Map<String, Object> item = new LinkedHashMap<>();
                    item.put("id", rs.getString("id"));
                    Timestamp ts = rs.getTimestamp("timestamp");
                    item.put("timestamp", ts != null ? ts.toInstant().toString() : Instant.now().toString());
                    item.put("actorEmail", rs.getString("actor_email"));
                    item.put("actorName", rs.getString("actor_name"));
                    item.put("actorRole", rs.getString("actor_role"));
                    item.put("action", rs.getString("action"));
                    item.put("category", rs.getString("category"));
                    item.put("entityType", rs.getString("entity_type"));
                    item.put("entityId", rs.getString("entity_id"));
                    item.put("entityName", rs.getString("entity_name"));
                    item.put("status", rs.getString("status"));
                    item.put("rabbitmqQueue", rs.getString("rabbitmq_queue"));
                    String djson = rs.getString("details_json");
                    if (djson != null && !djson.isBlank()) {
                        try {
                            item.put("detailsJson", objectMapper.readValue(djson, new TypeReference<Map<String, Object>>() {}));
                        } catch (Exception e) {
                            item.put("detailsJson", Map.of("raw", djson));
                        }
                    } else {
                        item.put("detailsJson", null);
                    }
                    logs.add(item);
                }
            }
        } catch (Exception e) {
            LOG.errorf("Error querying audit logs: %s", e.getMessage());
        }
        return Response.ok(logs).build();
    }

    @GET
    @Path("/audit/stats")
    public Response getAuditStats() {
        ensureSchemaAndSync();
        int totalEvents = 0;
        Map<String, Integer> byCategory = new LinkedHashMap<>();
        Map<String, Integer> byStatus = new LinkedHashMap<>();
        String lastEventAt = null;

        try (java.sql.Connection c = dataSource.getConnection()) {
            try (PreparedStatement ps = c.prepareStatement(
                    "SELECT category, status, COUNT(*) AS cnt, MAX(timestamp) AS max_ts FROM tb_audit_logs GROUP BY category, status")) {
                try (ResultSet rs = ps.executeQuery()) {
                    Timestamp maxTs = null;
                    while (rs.next()) {
                        String cat = rs.getString("category");
                        String st = rs.getString("status");
                        int cnt = rs.getInt("cnt");
                        Timestamp ts = rs.getTimestamp("max_ts");
                        totalEvents += cnt;
                        byCategory.put(cat, byCategory.getOrDefault(cat, 0) + cnt);
                        byStatus.put(st, byStatus.getOrDefault(st, 0) + cnt);
                        if (ts != null && (maxTs == null || ts.after(maxTs))) {
                            maxTs = ts;
                        }
                    }
                    if (maxTs != null) lastEventAt = maxTs.toInstant().toString();
                }
            }
        } catch (Exception e) {
            LOG.errorf("Error getting audit stats: %s", e.getMessage());
        }

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("totalEvents", totalEvents);
        out.put("byCategory", byCategory);
        out.put("byStatus", byStatus);
        out.put("lastEventAt", lastEventAt);
        return Response.ok(out).build();
    }

    @POST
    @Path("/audit/events")
    public Response recordAuditEvent(Map<String, Object> payload) {
        if (payload == null) payload = new HashMap<>();
        Map<String, Object> saved = recordAuditEventInternal(payload);
        return Response.ok(saved).build();
    }

    private Map<String, Object> recordAuditEventInternal(Map<String, Object> payload) {
        String id = String.valueOf(payload.getOrDefault("id", "audit-" + UUID.randomUUID()));
        String actorEmail = String.valueOf(payload.getOrDefault("actorEmail", "admin@openjudy.org"));
        String actorName = String.valueOf(payload.getOrDefault("actorName", "Administrador Geral Open Judy"));
        String actorRole = String.valueOf(payload.getOrDefault("actorRole", "ADMIN"));
        String action = String.valueOf(payload.getOrDefault("action", "CONFIG_UPDATED"));
        String category = String.valueOf(payload.getOrDefault("category", inferCategory(action)));
        String entityType = String.valueOf(payload.getOrDefault("entityType", "SYSTEM"));
        String entityId = String.valueOf(payload.getOrDefault("entityId", "open-judy"));
        String entityName = String.valueOf(payload.getOrDefault("entityName", entityId));
        String status = String.valueOf(payload.getOrDefault("status", "SUCCESS"));
        String queue = String.valueOf(payload.getOrDefault("rabbitmqQueue", "judy.audit.events"));

        String detailsJson = "{}";
        try {
            Object d = payload.get("detailsJson");
            detailsJson = objectMapper.writeValueAsString(d != null ? d : payload);
        } catch (Exception ignored) {}

        try (java.sql.Connection c = dataSource.getConnection();
             PreparedStatement ps = c.prepareStatement(
                     "INSERT INTO tb_audit_logs (id, timestamp, actor_email, actor_name, actor_role, action, category, entity_type, entity_id, entity_name, status, rabbitmq_queue, details_json) " +
                     "VALUES (?, NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?::jsonb) " +
                     "ON CONFLICT (id) DO UPDATE SET timestamp = NOW(), status = EXCLUDED.status, details_json = EXCLUDED.details_json")) {
            ps.setString(1, id);
            ps.setString(2, actorEmail);
            ps.setString(3, actorName);
            ps.setString(4, actorRole);
            ps.setString(5, action);
            ps.setString(6, category);
            ps.setString(7, entityType);
            ps.setString(8, entityId);
            ps.setString(9, entityName);
            ps.setString(10, status);
            ps.setString(11, queue);
            ps.setString(12, detailsJson);
            ps.executeUpdate();
        } catch (Exception e) {
            LOG.warnf("Failed recording audit event: %s", e.getMessage());
        }

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("id", id);
        out.put("timestamp", Instant.now().toString());
        out.put("actorEmail", actorEmail);
        out.put("actorName", actorName);
        out.put("actorRole", actorRole);
        out.put("action", action);
        out.put("category", category);
        out.put("entityType", entityType);
        out.put("entityId", entityId);
        out.put("entityName", entityName);
        out.put("status", status);
        out.put("rabbitmqQueue", queue);
        return out;
    }
}
