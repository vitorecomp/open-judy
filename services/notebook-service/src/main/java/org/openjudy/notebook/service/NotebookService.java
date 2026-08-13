package org.openjudy.notebook.service;

import io.agroal.api.AgroalDataSource;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.jboss.logging.Logger;
import org.openjudy.notebook.dto.*;

import java.sql.*;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@ApplicationScoped
public class NotebookService {

    private static final Logger LOG = Logger.getLogger(NotebookService.class);

    @Inject
    AgroalDataSource dataSource;

    public List<NotebookDTO> listNotebooks(UUID userId) {
        List<NotebookDTO> list = new ArrayList<>();
        String sql = "SELECT id, title, description, user_id, case_id, case_number, emoji, color, created_at, updated_at " +
                     "FROM tb_notebooks WHERE user_id = ? OR user_id IS NULL ORDER BY updated_at DESC";

        try (Connection conn = dataSource.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {

            ps.setObject(1, userId);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    UUID id = (UUID) rs.getObject("id");
                    List<NotebookSourceDTO> sources = getSources(conn, id);
                    List<NotebookNoteDTO> notes = getNotes(conn, id);
                    int totalActiveTokens = sources.stream().filter(NotebookSourceDTO::isActiveForChat).mapToInt(NotebookSourceDTO::estimatedTokens).sum();

                    Timestamp cTs = rs.getTimestamp("created_at");
                    Timestamp uTs = rs.getTimestamp("updated_at");

                    list.add(new NotebookDTO(
                            id,
                            rs.getString("title"),
                            rs.getString("description"),
                            (UUID) rs.getObject("user_id"),
                            (UUID) rs.getObject("case_id"),
                            rs.getString("case_number"),
                            rs.getString("emoji"),
                            rs.getString("color"),
                            sources,
                            notes,
                            totalActiveTokens,
                            cTs != null ? cTs.toInstant() : Instant.now(),
                            uTs != null ? uTs.toInstant() : Instant.now()
                    ));
                }
            }
        } catch (SQLException e) {
            LOG.error("Error listing notebooks", e);
        }
        return list;
    }

    public NotebookDTO getNotebook(UUID id) {
        String sql = "SELECT id, title, description, user_id, case_id, case_number, emoji, color, created_at, updated_at " +
                     "FROM tb_notebooks WHERE id = ?";

        try (Connection conn = dataSource.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {

            ps.setObject(1, id);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    List<NotebookSourceDTO> sources = getSources(conn, id);
                    List<NotebookNoteDTO> notes = getNotes(conn, id);
                    int totalActiveTokens = sources.stream().filter(NotebookSourceDTO::isActiveForChat).mapToInt(NotebookSourceDTO::estimatedTokens).sum();

                    Timestamp cTs = rs.getTimestamp("created_at");
                    Timestamp uTs = rs.getTimestamp("updated_at");

                    return new NotebookDTO(
                            id,
                            rs.getString("title"),
                            rs.getString("description"),
                            (UUID) rs.getObject("user_id"),
                            (UUID) rs.getObject("case_id"),
                            rs.getString("case_number"),
                            rs.getString("emoji"),
                            rs.getString("color"),
                            sources,
                            notes,
                            totalActiveTokens,
                            cTs != null ? cTs.toInstant() : Instant.now(),
                            uTs != null ? uTs.toInstant() : Instant.now()
                    );
                }
            }
        } catch (SQLException e) {
            LOG.errorf(e, "Error retrieving notebook %s", id);
        }
        return null;
    }

    public NotebookDTO createNotebook(CreateNotebookRequest req) {
        UUID id = UUID.randomUUID();
        Instant now = Instant.now();
        String emoji = req.emoji() != null ? req.emoji() : "📓";
        String color = req.color() != null ? req.color() : "#e63946";

        String sql = "INSERT INTO tb_notebooks (id, title, description, user_id, case_id, case_number, emoji, color, created_at, updated_at) " +
                     "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

        try (Connection conn = dataSource.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {

            ps.setObject(1, id);
            ps.setString(2, req.title());
            ps.setString(3, req.description());
            ps.setObject(4, req.userId());
            ps.setObject(5, req.caseId());
            ps.setString(6, req.caseNumber());
            ps.setString(7, emoji);
            ps.setString(8, color);
            ps.setTimestamp(9, Timestamp.from(now));
            ps.setTimestamp(10, Timestamp.from(now));

            ps.executeUpdate();
            return getNotebook(id);

        } catch (SQLException e) {
            LOG.error("Error creating notebook", e);
            throw new RuntimeException("Database error creating notebook", e);
        }
    }

    public boolean deleteNotebook(UUID id) {
        try (Connection conn = dataSource.getConnection();
             PreparedStatement ps = conn.prepareStatement("DELETE FROM tb_notebooks WHERE id = ?")) {
            ps.setObject(1, id);
            return ps.executeUpdate() > 0;
        } catch (SQLException e) {
            LOG.errorf(e, "Error deleting notebook %s", id);
            return false;
        }
    }

    public NotebookSourceDTO addSource(UUID notebookId, AddSourceRequest req) {
        UUID sourceId = UUID.randomUUID();
        Instant now = Instant.now();
        int tokens = req.estimatedTokens() != null ? req.estimatedTokens() : 256000;
        boolean active = req.isActiveForChat() == null || req.isActiveForChat();

        String sql = "INSERT INTO tb_notebook_sources (id, notebook_id, source_type, title, reference_id, block_index, content, estimated_tokens, is_active_for_chat, created_at) " +
                     "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

        try (Connection conn = dataSource.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {

            ps.setObject(1, sourceId);
            ps.setObject(2, notebookId);
            ps.setString(3, req.sourceType());
            ps.setString(4, req.title());
            ps.setString(5, req.referenceId());
            ps.setObject(6, req.blockIndex());
            ps.setString(7, req.content());
            ps.setInt(8, tokens);
            ps.setBoolean(9, active);
            ps.setTimestamp(10, Timestamp.from(now));

            ps.executeUpdate();

            return new NotebookSourceDTO(
                    sourceId,
                    notebookId,
                    req.sourceType(),
                    req.title(),
                    req.referenceId(),
                    req.blockIndex(),
                    req.content(),
                    tokens,
                    active,
                    now
            );
        } catch (SQLException e) {
            LOG.error("Error adding source to notebook", e);
            throw new RuntimeException("Database error adding source", e);
        }
    }

    public boolean toggleSourceActive(UUID notebookId, UUID sourceId, boolean active) {
        String sql = "UPDATE tb_notebook_sources SET is_active_for_chat = ? WHERE id = ? AND notebook_id = ?";
        try (Connection conn = dataSource.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setBoolean(1, active);
            ps.setObject(2, sourceId);
            ps.setObject(3, notebookId);
            return ps.executeUpdate() > 0;
        } catch (SQLException e) {
            LOG.errorf(e, "Error toggling source %s", sourceId);
            return false;
        }
    }

    public boolean deleteSource(UUID notebookId, UUID sourceId) {
        String sql = "DELETE FROM tb_notebook_sources WHERE id = ? AND notebook_id = ?";
        try (Connection conn = dataSource.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setObject(1, sourceId);
            ps.setObject(2, notebookId);
            return ps.executeUpdate() > 0;
        } catch (SQLException e) {
            LOG.errorf(e, "Error deleting source %s", sourceId);
            return false;
        }
    }

    public NotebookNoteDTO createNote(UUID notebookId, String title, String content, String noteType) {
        UUID id = UUID.randomUUID();
        Instant now = Instant.now();
        noteType = noteType != null ? noteType : "NOTE";

        String sql = "INSERT INTO tb_notebook_notes (id, notebook_id, title, content, note_type, created_at, updated_at) " +
                     "VALUES (?, ?, ?, ?, ?, ?, ?)";

        try (Connection conn = dataSource.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {

            ps.setObject(1, id);
            ps.setObject(2, notebookId);
            ps.setString(3, title);
            ps.setString(4, content);
            ps.setString(5, noteType);
            ps.setTimestamp(6, Timestamp.from(now));
            ps.setTimestamp(7, Timestamp.from(now));

            ps.executeUpdate();

            return new NotebookNoteDTO(id, notebookId, title, content, noteType, now, now);
        } catch (SQLException e) {
            LOG.error("Error creating note", e);
            throw new RuntimeException("Database error creating note", e);
        }
    }

    public List<NotebookSourceDTO> getSources(Connection conn, UUID notebookId) throws SQLException {
        List<NotebookSourceDTO> list = new ArrayList<>();
        String sql = "SELECT id, notebook_id, source_type, title, reference_id, block_index, content, estimated_tokens, is_active_for_chat, created_at " +
                     "FROM tb_notebook_sources WHERE notebook_id = ? ORDER BY created_at ASC";

        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setObject(1, notebookId);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    Timestamp cTs = rs.getTimestamp("created_at");
                    list.add(new NotebookSourceDTO(
                            (UUID) rs.getObject("id"),
                            (UUID) rs.getObject("notebook_id"),
                            rs.getString("source_type"),
                            rs.getString("title"),
                            rs.getString("reference_id"),
                            rs.getObject("block_index") != null ? rs.getInt("block_index") : null,
                            rs.getString("content"),
                            rs.getInt("estimated_tokens"),
                            rs.getBoolean("is_active_for_chat"),
                            cTs != null ? cTs.toInstant() : Instant.now()
                    ));
                }
            }
        }
        return list;
    }

    public List<NotebookNoteDTO> getNotes(Connection conn, UUID notebookId) throws SQLException {
        List<NotebookNoteDTO> list = new ArrayList<>();
        String sql = "SELECT id, notebook_id, title, content, note_type, created_at, updated_at " +
                     "FROM tb_notebook_notes WHERE notebook_id = ? ORDER BY updated_at DESC";

        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setObject(1, notebookId);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    Timestamp cTs = rs.getTimestamp("created_at");
                    Timestamp uTs = rs.getTimestamp("updated_at");
                    list.add(new NotebookNoteDTO(
                            (UUID) rs.getObject("id"),
                            (UUID) rs.getObject("notebook_id"),
                            rs.getString("title"),
                            rs.getString("content"),
                            rs.getString("note_type"),
                            cTs != null ? cTs.toInstant() : Instant.now(),
                            uTs != null ? uTs.toInstant() : Instant.now()
                    ));
                }
            }
        }
        return list;
    }
}
