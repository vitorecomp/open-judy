package org.openjudy.notification.service;

import io.agroal.api.AgroalDataSource;
import io.smallrye.mutiny.Multi;
import io.smallrye.mutiny.operators.multi.processors.BroadcastProcessor;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.jboss.logging.Logger;
import org.openjudy.common.dto.NotificationDTO;
import org.openjudy.common.enums.NotificationCategory;
import org.openjudy.common.enums.NotificationPriority;
import org.openjudy.common.enums.UserRole;

import java.sql.*;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@ApplicationScoped
public class NotificationService {

    private static final Logger LOG = Logger.getLogger(NotificationService.class);

    @Inject
    AgroalDataSource dataSource;

    private final BroadcastProcessor<NotificationDTO> sseBroadcaster = BroadcastProcessor.create();

    public Multi<NotificationDTO> getNotificationStream() {
        return sseBroadcaster;
    }

    public NotificationDTO createNotification(
            UUID userId,
            UserRole targetRole,
            String title,
            String message,
            NotificationCategory category,
            NotificationPriority priority,
            String actionUrl,
            UUID hearingId) {

        UUID id = UUID.randomUUID();
        Instant now = Instant.now();
        category = category != null ? category : NotificationCategory.AUDIO_PROCESSING;
        priority = priority != null ? priority : NotificationPriority.NORMAL;

        String sql = "INSERT INTO tb_notifications (id, user_id, target_role, title, message, category, priority, is_read, action_url, hearing_id, created_at) " +
                     "VALUES (?, ?, ?, ?, ?, ?, ?, FALSE, ?, ?, ?)";

        try (Connection conn = dataSource.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {

            ps.setObject(1, id);
            ps.setObject(2, userId);
            ps.setString(3, targetRole != null ? targetRole.name() : null);
            ps.setString(4, title);
            ps.setString(5, message);
            ps.setString(6, category.name());
            ps.setString(7, priority.name());
            ps.setString(8, actionUrl);
            ps.setObject(9, hearingId);
            ps.setTimestamp(10, Timestamp.from(now));

            ps.executeUpdate();

            NotificationDTO dto = new NotificationDTO(
                    id,
                    userId,
                    targetRole,
                    title,
                    message,
                    category,
                    priority,
                    false,
                    actionUrl,
                    now
            );

            LOG.infof("Created judicial notification: [%s] %s", category, title);
            
            // Broadcast event to live SSE subscribers
            sseBroadcaster.onNext(dto);

            return dto;

        } catch (SQLException e) {
            LOG.errorf(e, "Error creating notification: %s", title);
            throw new RuntimeException("Database error creating notification", e);
        }
    }

    public List<NotificationDTO> listNotifications(UUID userId, UserRole targetRole, Boolean unreadOnly, int limit) {
        List<NotificationDTO> list = new ArrayList<>();
        StringBuilder sql = new StringBuilder("SELECT id, user_id, target_role, title, message, category, priority, is_read, action_url, created_at, read_at FROM tb_notifications WHERE 1=1 ");

        List<Object> params = new ArrayList<>();

        if (userId != null) {
            sql.append("AND (user_id = ? OR user_id IS NULL) ");
            params.add(userId);
        }

        if (targetRole != null) {
            sql.append("AND (target_role = ? OR target_role IS NULL) ");
            params.add(targetRole.name());
        }

        if (Boolean.TRUE.equals(unreadOnly)) {
            sql.append("AND is_read = FALSE ");
        }

        sql.append("ORDER BY created_at DESC LIMIT ?");
        params.add(Math.min(limit > 0 ? limit : 50, 100));

        try (Connection conn = dataSource.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql.toString())) {

            for (int i = 0; i < params.size(); i++) {
                ps.setObject(i + 1, params.get(i));
            }

            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    Timestamp createdTs = rs.getTimestamp("created_at");
                    Timestamp readTs = rs.getTimestamp("read_at");
                    String roleStr = rs.getString("target_role");

                    list.add(new NotificationDTO(
                            (UUID) rs.getObject("id"),
                            (UUID) rs.getObject("user_id"),
                            roleStr != null ? UserRole.valueOf(roleStr) : null,
                            rs.getString("title"),
                            rs.getString("message"),
                            NotificationCategory.valueOf(rs.getString("category")),
                            NotificationPriority.valueOf(rs.getString("priority")),
                            rs.getBoolean("is_read"),
                            rs.getString("action_url"),
                            createdTs != null ? createdTs.toInstant() : Instant.now(),
                            readTs != null ? readTs.toInstant() : null
                    ));
                }
            }
        } catch (SQLException e) {
            LOG.error("Error listing notifications", e);
        }
        return list;
    }

    public long countUnread(UUID userId, UserRole targetRole) {
        StringBuilder sql = new StringBuilder("SELECT COUNT(*) FROM tb_notifications WHERE is_read = FALSE ");
        List<Object> params = new ArrayList<>();

        if (userId != null) {
            sql.append("AND (user_id = ? OR user_id IS NULL) ");
            params.add(userId);
        }
        if (targetRole != null) {
            sql.append("AND (target_role = ? OR target_role IS NULL) ");
            params.add(targetRole.name());
        }

        try (Connection conn = dataSource.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql.toString())) {

            for (int i = 0; i < params.size(); i++) {
                ps.setObject(i + 1, params.get(i));
            }

            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    return rs.getLong(1);
                }
            }
        } catch (SQLException e) {
            LOG.error("Error counting unread notifications", e);
        }
        return 0L;
    }

    public boolean markAsRead(UUID id) {
        String sql = "UPDATE tb_notifications SET is_read = TRUE, read_at = CURRENT_TIMESTAMP WHERE id = ?";
        try (Connection conn = dataSource.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setObject(1, id);
            return ps.executeUpdate() > 0;
        } catch (SQLException e) {
            LOG.errorf(e, "Error marking notification %s as read", id);
            return false;
        }
    }

    public int markAllAsRead(UUID userId) {
        String sql = userId != null ?
                "UPDATE tb_notifications SET is_read = TRUE, read_at = CURRENT_TIMESTAMP WHERE is_read = FALSE AND (user_id = ? OR user_id IS NULL)" :
                "UPDATE tb_notifications SET is_read = TRUE, read_at = CURRENT_TIMESTAMP WHERE is_read = FALSE";

        try (Connection conn = dataSource.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            if (userId != null) {
                ps.setObject(1, userId);
            }
            return ps.executeUpdate();
        } catch (SQLException e) {
            LOG.error("Error marking all notifications as read", e);
            return 0;
        }
    }
}
