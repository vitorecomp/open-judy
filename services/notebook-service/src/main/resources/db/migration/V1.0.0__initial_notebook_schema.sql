-- =========================================================================
-- Open Judy :: Judicial Notebook & Open Multi-Context Chat Schema
-- =========================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS tb_notebooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    user_id UUID,
    case_id UUID,
    case_number VARCHAR(64),
    emoji VARCHAR(16) DEFAULT '📓',
    color VARCHAR(32) DEFAULT '#e63946',
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

