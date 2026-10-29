-- =========================================================================
-- Open Judy :: notification-service Schema Migration
-- =========================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS tb_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    target_role VARCHAR(64),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    category VARCHAR(64) NOT NULL DEFAULT 'AUDIO_PROCESSING',
    priority VARCHAR(32) NOT NULL DEFAULT 'NORMAL',
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    action_url VARCHAR(500),
    hearing_id UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    read_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON tb_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_target_role ON tb_notifications(target_role);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON tb_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON tb_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_hearing_id ON tb_notifications(hearing_id);

