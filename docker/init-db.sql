-- =========================================================================
-- Open Judy :: AlloyDB / PostgreSQL + pgvector Master Initialization Script
-- =========================================================================

-- Enable extensions for UUID generation and AI semantic search on AlloyDB / PostgreSQL
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Create schema if not exists
CREATE SCHEMA IF NOT EXISTS open_judy;

-- Grants
GRANT ALL ON SCHEMA open_judy TO judy_user;
GRANT ALL ON SCHEMA public TO judy_user;

-- =========================================================================
-- 1. User Service Schema (tb_users, tb_user_configurations, tb_user_activity_logs, tb_system_configurations)
-- =========================================================================

CREATE TABLE IF NOT EXISTS tb_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    keycloak_id VARCHAR(128),
    username VARCHAR(64) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    document_number VARCHAR(64),
    role VARCHAR(64) NOT NULL,
    court_jurisdiction VARCHAR(255),
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    avatar_url VARCHAR(512),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_username ON tb_users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON tb_users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON tb_users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON tb_users(status);

CREATE TABLE IF NOT EXISTS tb_user_configurations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES tb_users(id) ON DELETE CASCADE,
    theme VARCHAR(32) NOT NULL DEFAULT 'DARK',
    language VARCHAR(16) NOT NULL DEFAULT 'pt-BR',
    font_size VARCHAR(16) NOT NULL DEFAULT 'MEDIUM',
    high_contrast BOOLEAN NOT NULL DEFAULT FALSE,
    compact_view BOOLEAN NOT NULL DEFAULT FALSE,
    default_landing_page VARCHAR(32) NOT NULL DEFAULT 'DASHBOARD',
    playback_rate DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    auto_play_next_segment BOOLEAN NOT NULL DEFAULT TRUE,
    auto_scroll_transcript BOOLEAN NOT NULL DEFAULT TRUE,
    show_waveform BOOLEAN NOT NULL DEFAULT TRUE,
    skip_silence BOOLEAN NOT NULL DEFAULT FALSE,
    default_skip_seconds INT NOT NULL DEFAULT 5,
    auto_generate_ata_draft BOOLEAN NOT NULL DEFAULT TRUE,
    auto_detect_contradictions BOOLEAN NOT NULL DEFAULT TRUE,
    default_ata_template VARCHAR(64) NOT NULL DEFAULT 'PADRAO_CIVEL',
    ai_temperature DOUBLE PRECISION NOT NULL DEFAULT 0.2,
    enable_copilot_suggestions BOOLEAN NOT NULL DEFAULT TRUE,
    citation_style VARCHAR(32) NOT NULL DEFAULT 'TIMESTAMPS_ONLY',
    email_notifications BOOLEAN NOT NULL DEFAULT TRUE,
    hearing_completed_alert BOOLEAN NOT NULL DEFAULT TRUE,
    contradiction_detected_alert BOOLEAN NOT NULL DEFAULT TRUE,
    ata_ready_alert BOOLEAN NOT NULL DEFAULT TRUE,
    daily_digest BOOLEAN NOT NULL DEFAULT FALSE,
    digital_certificate_subject VARCHAR(255),
    auto_sign_approved_minutes BOOLEAN NOT NULL DEFAULT FALSE,
    judge_signature_title VARCHAR(255),
    custom_preferences_json TEXT DEFAULT '{}',
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_configs_user_id ON tb_user_configurations(user_id);

CREATE TABLE IF NOT EXISTS tb_user_activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES tb_users(id) ON DELETE CASCADE,
    action VARCHAR(64) NOT NULL,
    description VARCHAR(500),
    ip_address VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_activity_user_id ON tb_user_activity_logs(user_id);

CREATE TABLE IF NOT EXISTS tb_system_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    system_name VARCHAR(128) NOT NULL DEFAULT 'Open Judy',
    logo_url VARCHAR(512),
    gemini_model VARCHAR(64) NOT NULL DEFAULT 'gemini-4-argon',
    gemini_embedding_model VARCHAR(64) NOT NULL DEFAULT 'text-embedding-004',
    max_audio_duration_minutes INT NOT NULL DEFAULT 240,
    vector_similarity_threshold DOUBLE PRECISION NOT NULL DEFAULT 0.75,
    zero_trust_enforced BOOLEAN NOT NULL DEFAULT TRUE,
    audit_log_retention_days INT NOT NULL DEFAULT 365,
    maintenance_mode BOOLEAN NOT NULL DEFAULT FALSE,
    default_language VARCHAR(16) NOT NULL DEFAULT 'pt-BR',
    audio_storage_bucket VARCHAR(128) NOT NULL DEFAULT 'open-judy-audio-archive',
    system_properties_json TEXT NOT NULL DEFAULT '{}',
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================================
-- 2. Config Service Schema (tb_prompt_templates, tb_ai_models, tb_dashboard_types, tb_notification_types, tb_system_settings)
-- =========================================================================

CREATE TABLE IF NOT EXISTS tb_prompt_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(64) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description VARCHAR(500),
    category VARCHAR(64) NOT NULL,
    system_instruction TEXT,
    user_prompt_template TEXT NOT NULL,
    variables_json TEXT NOT NULL DEFAULT '[]',
    default_model VARCHAR(64) DEFAULT 'gemini-4-argon',
    default_temperature DOUBLE PRECISION DEFAULT 0.2,
    default_max_tokens INT DEFAULT 8192,
    version INT NOT NULL DEFAULT 1,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prompt_code ON tb_prompt_templates(code);
CREATE INDEX IF NOT EXISTS idx_prompt_category ON tb_prompt_templates(category);
CREATE INDEX IF NOT EXISTS idx_prompt_active ON tb_prompt_templates(active);

CREATE TABLE IF NOT EXISTS tb_ai_models (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    model_id VARCHAR(128) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    provider VARCHAR(64) NOT NULL,
    model_type VARCHAR(64) NOT NULL,
    description VARCHAR(500),
    context_window_tokens INT NOT NULL DEFAULT 1048576,
    max_output_tokens INT NOT NULL DEFAULT 8192,
    supports_multimodal BOOLEAN NOT NULL DEFAULT TRUE,
    supports_audio BOOLEAN NOT NULL DEFAULT TRUE,
    supports_streaming BOOLEAN NOT NULL DEFAULT TRUE,
    supports_system_instruction BOOLEAN NOT NULL DEFAULT TRUE,
    cost_per_1k_input_tokens DOUBLE PRECISION DEFAULT 0.0,
    cost_per_1k_output_tokens DOUBLE PRECISION DEFAULT 0.0,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    parameters_json TEXT NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_models_model_id ON tb_ai_models(model_id);
CREATE INDEX IF NOT EXISTS idx_models_provider ON tb_ai_models(provider);
CREATE INDEX IF NOT EXISTS idx_models_type ON tb_ai_models(model_type);
CREATE INDEX IF NOT EXISTS idx_models_default ON tb_ai_models(is_default);

CREATE TABLE IF NOT EXISTS tb_dashboard_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(64) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description VARCHAR(500),
    target_role VARCHAR(64) NOT NULL,
    layout_type VARCHAR(32) NOT NULL DEFAULT 'GRID',
    widgets_json TEXT NOT NULL DEFAULT '[]',
    default_landing BOOLEAN NOT NULL DEFAULT FALSE,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dashboard_code ON tb_dashboard_types(code);
CREATE INDEX IF NOT EXISTS idx_dashboard_role ON tb_dashboard_types(target_role);

CREATE TABLE IF NOT EXISTS tb_notification_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(64) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description VARCHAR(500),
    category VARCHAR(64) NOT NULL,
    default_priority VARCHAR(32) NOT NULL DEFAULT 'NORMAL',
    supported_channels_json TEXT NOT NULL DEFAULT '["IN_APP","EMAIL"]',
    template_title VARCHAR(255) NOT NULL,
    template_body TEXT NOT NULL,
    allow_user_override BOOLEAN NOT NULL DEFAULT TRUE,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notif_code ON tb_notification_types(code);
CREATE INDEX IF NOT EXISTS idx_notif_category ON tb_notification_types(category);
CREATE INDEX IF NOT EXISTS idx_notif_priority ON tb_notification_types(default_priority);

CREATE TABLE IF NOT EXISTS tb_system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category VARCHAR(64) NOT NULL,
    setting_key VARCHAR(128) NOT NULL UNIQUE,
    setting_value TEXT NOT NULL,
    value_type VARCHAR(32) NOT NULL DEFAULT 'STRING',
    description VARCHAR(500),
    is_secret BOOLEAN NOT NULL DEFAULT FALSE,
    is_read_only BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_setting_key ON tb_system_settings(setting_key);
CREATE INDEX IF NOT EXISTS idx_setting_category ON tb_system_settings(category);

-- =========================================================================
-- 3. Case & Transcription Service Schema
--    (tb_cases, tb_case_documents, tb_hearings, tb_participants, tb_transcripts,
--     tb_transcript_blocks, tb_transcript_segments, tb_ata_drafts, tb_hearing_summaries)
-- =========================================================================

CREATE TABLE IF NOT EXISTS tb_cases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_number VARCHAR(64) NOT NULL UNIQUE,
    court_jurisdiction VARCHAR(255) NOT NULL,
    legal_branch VARCHAR(64) NOT NULL DEFAULT 'CIVIL',
    subject VARCHAR(500),
    plaintiff_name VARCHAR(255),
    defendant_name VARCHAR(255),
    judge_name VARCHAR(255),
    prosecutor_name VARCHAR(255),
    status VARCHAR(64) NOT NULL DEFAULT 'EM_ANDAMENTO',
    distribution_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cases_case_number ON tb_cases(case_number);
CREATE INDEX IF NOT EXISTS idx_cases_legal_branch ON tb_cases(legal_branch);
CREATE INDEX IF NOT EXISTS idx_cases_status ON tb_cases(status);

CREATE TABLE IF NOT EXISTS tb_case_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID NOT NULL REFERENCES tb_cases(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    document_type VARCHAR(64) NOT NULL DEFAULT 'OUTROS',
    file_name VARCHAR(255),
    file_size BIGINT DEFAULT 0,
    mime_type VARCHAR(128) DEFAULT 'application/pdf',
    storage_uri VARCHAR(512),
    page_count INT DEFAULT 1,
    ocr_status VARCHAR(32) NOT NULL DEFAULT 'COMPLETED',
    extracted_text TEXT,
    uploaded_by VARCHAR(255),
    uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_case_documents_case_id ON tb_case_documents(case_id);

CREATE TABLE IF NOT EXISTS tb_hearings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID NOT NULL REFERENCES tb_cases(id) ON DELETE CASCADE,
    hearing_type VARCHAR(64) NOT NULL DEFAULT 'INSTRUCAO_E_JULGAMENTO',
    scheduled_date_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    status VARCHAR(64) NOT NULL DEFAULT 'PENDING',
    media_type VARCHAR(32) NOT NULL DEFAULT 'VIDEO',
    audio_url VARCHAR(512),
    audio_filename VARCHAR(255),
    audio_duration_seconds DOUBLE PRECISION DEFAULT 0.0,
    audio_size_bytes BIGINT DEFAULT 0,
    media_url VARCHAR(512),
    media_filename VARCHAR(255),
    media_duration_seconds DOUBLE PRECISION DEFAULT 0.0,
    media_size_bytes BIGINT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hearings_case_id ON tb_hearings(case_id);
CREATE INDEX IF NOT EXISTS idx_hearings_status ON tb_hearings(status);
CREATE INDEX IF NOT EXISTS idx_hearings_scheduled_date ON tb_hearings(scheduled_date_time DESC);

CREATE TABLE IF NOT EXISTS tb_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID REFERENCES tb_cases(id) ON DELETE CASCADE,
    hearing_id UUID REFERENCES tb_hearings(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(64) NOT NULL,
    document_number VARCHAR(64),
    email VARCHAR(255),
    notes TEXT,
    is_present BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_participants_case_id ON tb_participants(case_id);
CREATE INDEX IF NOT EXISTS idx_participants_hearing_id ON tb_participants(hearing_id);

CREATE TABLE IF NOT EXISTS tb_transcripts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hearing_id UUID NOT NULL UNIQUE REFERENCES tb_hearings(id) ON DELETE CASCADE,
    detected_language VARCHAR(16) NOT NULL DEFAULT 'pt-BR',
    total_segments INT NOT NULL DEFAULT 0,
    average_confidence DOUBLE PRECISION DEFAULT 0.0,
    engine_used VARCHAR(64) DEFAULT 'GEMINI-3.8-FLASH',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transcripts_hearing_id ON tb_transcripts(hearing_id);

CREATE TABLE IF NOT EXISTS tb_transcript_blocks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hearing_id UUID NOT NULL REFERENCES tb_hearings(id) ON DELETE CASCADE,
    block_index INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    start_time_ms BIGINT NOT NULL,
    end_time_ms BIGINT NOT NULL,
    start_time_formatted VARCHAR(16) NOT NULL,
    end_time_formatted VARCHAR(16) NOT NULL,
    estimated_tokens INT NOT NULL DEFAULT 256000,
    segment_count INT NOT NULL DEFAULT 0,
    summary TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_hearing_block_index UNIQUE (hearing_id, block_index)
);

CREATE INDEX IF NOT EXISTS idx_transcript_blocks_hearing_id ON tb_transcript_blocks(hearing_id);

CREATE TABLE IF NOT EXISTS tb_transcript_segments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transcript_id UUID NOT NULL REFERENCES tb_transcripts(id) ON DELETE CASCADE,
    segment_index INT NOT NULL,
    start_time_ms BIGINT NOT NULL,
    end_time_ms BIGINT NOT NULL,
    speaker_role VARCHAR(64) NOT NULL,
    speaker_name VARCHAR(255) NOT NULL,
    text TEXT NOT NULL,
    confidence_score DOUBLE PRECISION DEFAULT 0.95,
    is_key_statement BOOLEAN NOT NULL DEFAULT FALSE,
    topic_tag VARCHAR(128),
    block_id UUID REFERENCES tb_transcript_blocks(id) ON DELETE SET NULL,
    block_index INT DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transcript_segments_transcript_id ON tb_transcript_segments(transcript_id);
CREATE INDEX IF NOT EXISTS idx_transcript_segments_index ON tb_transcript_segments(transcript_id, segment_index);

CREATE TABLE IF NOT EXISTS tb_ata_drafts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hearing_id UUID NOT NULL REFERENCES tb_hearings(id) ON DELETE CASCADE,
    case_number VARCHAR(64) NOT NULL,
    title VARCHAR(255) NOT NULL,
    markdown_content TEXT NOT NULL,
    key_points_json JSONB DEFAULT '[]'::jsonb,
    contradictions_json JSONB DEFAULT '[]'::jsonb,
    deliberations_json JSONB DEFAULT '[]'::jsonb,
    approved_by_judge BOOLEAN NOT NULL DEFAULT FALSE,
    generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ata_drafts_hearing_id ON tb_ata_drafts(hearing_id);

CREATE TABLE IF NOT EXISTS tb_hearing_summaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hearing_id UUID NOT NULL UNIQUE REFERENCES tb_hearings(id) ON DELETE CASCADE,
    executive_summary TEXT NOT NULL,
    key_testimonies_json JSONB DEFAULT '[]'::jsonb,
    detected_contradictions_json JSONB DEFAULT '[]'::jsonb,
    suggested_next_steps_json JSONB DEFAULT '[]'::jsonb,
    generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hearing_summaries_hearing_id ON tb_hearing_summaries(hearing_id);

-- =========================================================================
-- 4. Notebook Service Schema (tb_notebooks, tb_notebook_sources, tb_notebook_chat_messages, tb_notebook_notes)
-- =========================================================================

CREATE TABLE IF NOT EXISTS tb_notebooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    user_id UUID,
    case_id UUID,
    case_number VARCHAR(64),
    emoji VARCHAR(16) DEFAULT '📓',
    color VARCHAR(32) DEFAULT '#2563eb',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tb_notebook_sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    notebook_id UUID NOT NULL REFERENCES tb_notebooks(id) ON DELETE CASCADE,
    source_type VARCHAR(64) NOT NULL,
    title VARCHAR(255) NOT NULL,
    reference_id VARCHAR(255),
    block_index INT,
    content TEXT,
    estimated_tokens INT NOT NULL DEFAULT 1000,
    is_active_for_chat BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tb_notebook_chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    notebook_id UUID NOT NULL REFERENCES tb_notebooks(id) ON DELETE CASCADE,
    role VARCHAR(32) NOT NULL,
    content TEXT NOT NULL,
    active_sources_json JSONB,
    citations_json JSONB,
    tokens_used INT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tb_notebook_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    notebook_id UUID NOT NULL REFERENCES tb_notebooks(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    note_type VARCHAR(64) DEFAULT 'NOTE',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notebooks_user_id ON tb_notebooks(user_id);
CREATE INDEX IF NOT EXISTS idx_notebook_sources_notebook_id ON tb_notebook_sources(notebook_id);
CREATE INDEX IF NOT EXISTS idx_notebook_chat_messages_notebook_id ON tb_notebook_chat_messages(notebook_id);
CREATE INDEX IF NOT EXISTS idx_notebook_notes_notebook_id ON tb_notebook_notes(notebook_id);

-- =========================================================================
-- 5. Notification Service Schema (tb_notifications)
-- =========================================================================

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

-- =========================================================================
-- 6. Task & Audit Microservice Schema (tb_async_tasks, tb_audit_logs)
-- =========================================================================

CREATE TABLE IF NOT EXISTS tb_async_tasks (
    id VARCHAR(128) PRIMARY KEY,
    task_type VARCHAR(64) NOT NULL,
    entity_type VARCHAR(64) NOT NULL DEFAULT 'HEARING',
    entity_id VARCHAR(128) NOT NULL,
    entity_title VARCHAR(512) NOT NULL,
    queue_name VARCHAR(128) NOT NULL DEFAULT 'judy.transcription.jobs',
    routing_key VARCHAR(128) NOT NULL DEFAULT 'transcription.job',
    status VARCHAR(64) NOT NULL DEFAULT 'QUEUED',
    progress_pct INT NOT NULL DEFAULT 0,
    prompt_version VARCHAR(255) DEFAULT 'PROMPT_AUDIO_VIDEO_TRANSCRIPTION v3 (OPT_V1_DIARIZATION_SURGICAL)',
    pipeline_version VARCHAR(128) DEFAULT 'v3.2-VAD-SYNC (gemini-3.8-flash)',
    worker_id VARCHAR(128) DEFAULT 'rabbitmq-worker-01',
    retry_count INT NOT NULL DEFAULT 0,
    triggered_by VARCHAR(128) DEFAULT 'system.rabbitmq',
    payload_json JSONB,
    result_summary TEXT,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    duration_ms BIGINT,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_async_tasks_type_status ON tb_async_tasks(task_type, status);
CREATE INDEX IF NOT EXISTS idx_async_tasks_entity_id ON tb_async_tasks(entity_id);
CREATE INDEX IF NOT EXISTS idx_async_tasks_created_at ON tb_async_tasks(created_at DESC);

CREATE TABLE IF NOT EXISTS tb_audit_logs (
    id VARCHAR(128) PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    actor_email VARCHAR(255) NOT NULL DEFAULT 'admin@openjudy.org',
    actor_name VARCHAR(255) NOT NULL DEFAULT 'Administrador Geral Open Judy',
    actor_role VARCHAR(64) NOT NULL DEFAULT 'ADMIN',
    action VARCHAR(128) NOT NULL,
    category VARCHAR(64) NOT NULL DEFAULT 'TASK',
    entity_type VARCHAR(64) NOT NULL DEFAULT 'HEARING',
    entity_id VARCHAR(128) NOT NULL,
    entity_name VARCHAR(512) NOT NULL,
    status VARCHAR(64) NOT NULL DEFAULT 'SUCCESS',
    rabbitmq_queue VARCHAR(128) NOT NULL DEFAULT 'judy.audit.events',
    details_json JSONB
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON tb_audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_category ON tb_audit_logs(category);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON tb_audit_logs(action);

CREATE INDEX IF NOT EXISTS idx_notifications_hearing_id ON tb_notifications(hearing_id);

