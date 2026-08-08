-- =========================================================================
-- Open Judy :: user-service Initial Database Schema
-- =========================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: tb_users
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

-- Table: tb_user_configurations
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

-- Table: tb_user_activity_logs
CREATE TABLE IF NOT EXISTS tb_user_activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES tb_users(id) ON DELETE CASCADE,
    action VARCHAR(64) NOT NULL,
    description VARCHAR(500),
    ip_address VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_activity_user_id ON tb_user_activity_logs(user_id);

-- Seed Initial Core Users & Configurations
INSERT INTO tb_users (id, username, email, full_name, document_number, role, court_jurisdiction, status, avatar_url)
VALUES
    ('a0000000-0000-0000-0000-000000000001', 'camila.vasconcelos', 'camila.vasconcelos@tjsp.jus.br', 'Dra. Camila Vasconcelos de Albuquerque', 'TJSP-44910', 'MAGISTRADO', '3ª Vara Cível Central da Comarca de São Paulo/SP', 'ACTIVE', 'https://ui-avatars.com/api/?name=Camila+Vasconcelos&background=e63946&color=fff'),
    ('a0000000-0000-0000-0000-000000000002', 'marcos.assessor', 'marcos.assessor@tjsp.jus.br', 'Marcos Vinicius de Souza', 'ASSESS-8831', 'ASSESSOR', '3ª Vara Cível Central da Comarca de São Paulo/SP', 'ACTIVE', 'https://ui-avatars.com/api/?name=Marcos+Souza&background=4f46e5&color=fff'),
    ('a0000000-0000-0000-0000-000000000003', 'lucas.menezes', 'lucas.menezes@advocacia.com.br', 'Dr. Lucas Menezes Braga', 'OAB/SP 389.122', 'ADVOGADO', 'São Paulo/SP', 'ACTIVE', 'https://ui-avatars.com/api/?name=Lucas+Menezes&background=0284c7&color=fff'),
    ('a0000000-0000-0000-0000-000000000004', 'admin.judy', 'admin@openjudy.org', 'Administrador Geral Open Judy', 'SYS-001', 'ADMIN', 'Tribunal de Justiça - Coordenação de TI e IA', 'ACTIVE', 'https://ui-avatars.com/api/?name=Open+Judy+Admin&background=10b981&color=fff')
ON CONFLICT (id) DO NOTHING;

INSERT INTO tb_user_configurations (id, user_id, theme, language, font_size, default_landing_page, playback_rate, auto_generate_ata_draft, auto_detect_contradictions, default_ata_template, ai_temperature, judge_signature_title)
VALUES
    ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'DARK', 'pt-BR', 'MEDIUM', 'DASHBOARD', 1.0, TRUE, TRUE, 'PADRAO_CIVEL', 0.2, 'Juíza de Direito da 3ª Vara Cível Central'),
    ('c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', 'DARK', 'pt-BR', 'MEDIUM', 'HEARINGS', 1.0, TRUE, TRUE, 'PADRAO_CIVEL', 0.2, 'Assessor de Gabinete'),
    ('c0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000003', 'DARK', 'pt-BR', 'MEDIUM', 'HEARINGS', 1.25, TRUE, TRUE, 'PADRAO_CIVEL', 0.2, NULL),
    ('c0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000004', 'DARK', 'pt-BR', 'MEDIUM', 'DASHBOARD', 1.0, TRUE, TRUE, 'PADRAO_CIVEL', 0.2, 'Administrador do Sistema')
ON CONFLICT (id) DO NOTHING;

-- 4. Tabela de Configurações Globais do Sistema (Admin)
CREATE TABLE IF NOT EXISTS tb_system_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gemini_model VARCHAR(64) NOT NULL DEFAULT 'gemini-2.0-flash',
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

INSERT INTO tb_system_configurations (id, gemini_model, gemini_embedding_model, max_audio_duration_minutes, vector_similarity_threshold, zero_trust_enforced, audit_log_retention_days, maintenance_mode, system_properties_json)
VALUES (
    'e0000000-0000-0000-0000-000000000001',
    'gemini-2.0-flash',
    'text-embedding-004',
    240,
    0.75,
    TRUE,
    365,
    FALSE,
    '{"copilotMaxHistoryTurns":20,"enableMultimodalDiarization":true,"alloyDbVectorDimensions":768}'
)
ON CONFLICT (id) DO NOTHING;

