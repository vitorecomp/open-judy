-- =========================================================================
-- Open Judy :: case-service Initial Database Schema & Seed Data
-- =========================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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

