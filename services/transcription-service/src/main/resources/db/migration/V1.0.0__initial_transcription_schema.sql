-- =========================================================================
-- Open Judy :: transcription-service Initial Database Schema & Seed Data
-- =========================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Table: tb_cases (Judicial Cases)
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

-- 2. Table: tb_case_documents (Autos e Peças Processuais)
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

-- 3. Table: tb_hearings (Audiências Judiciais)
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

-- 4. Table: tb_participants (Participantes da Audiência / Processo)
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

-- 5. Table: tb_transcripts (Transcrição Consolidada por Audiência)
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

-- 6. Table: tb_transcript_segments (Segmentos Diarizados da Transcrição)
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
    block_id UUID,
    block_index INT DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transcript_segments_transcript_id ON tb_transcript_segments(transcript_id);
CREATE INDEX IF NOT EXISTS idx_transcript_segments_index ON tb_transcript_segments(transcript_id, segment_index);

-- 7. Table: tb_ata_drafts (Minutas de Termos/Atas de Audiência)
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

-- 8. Table: tb_hearing_summaries (Resumos Executivos de Audiência)
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

