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

-- Seed Initial Demo Notebook
INSERT INTO tb_notebooks (id, title, description, case_number, emoji, color)
VALUES
(
    'a1111111-2222-3333-4444-555555555555',
    'Caderno de Análise: Rescisão Contratual Imobiliária',
    'Pesquisa comparativa entre a instrução probatória em vídeo e as teses de retenção de 20% vs 100% de restituição.',
    '0014238-19.2024.8.26.0100',
    '⚖️',
    '#e63946'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO tb_notebook_sources (id, notebook_id, source_type, title, reference_id, block_index, estimated_tokens, is_active_for_chat, content)
VALUES
(
    'b1111111-1111-1111-1111-111111111111',
    'a1111111-2222-3333-4444-555555555555',
    'VIDEO_BLOCK',
    'Bloco 1: Abertura e Tentativa de Conciliação',
    'f1e2d3c4-b5a6-9788-7654-3210fedcba98',
    1,
    252000,
    TRUE,
    '[00:00 - 00:18] MAGISTRADO: Declaro aberta a audiência... [00:19 - 00:31] ADVOGADO_AUTOR: Tentamos contato prévio... [00:31 - 00:48] ADVOGADO_REU: Mantemos proposta de retenção contratual de 20%...'
),
(
    'b2222222-2222-2222-2222-222222222222',
    'a1111111-2222-3333-4444-555555555555',
    'VIDEO_BLOCK',
    'Bloco 2: Saneamento e Depoimento da Autora',
    'f1e2d3c4-b5a6-9788-7654-3210fedcba98',
    2,
    256000,
    TRUE,
    '[00:49 - 01:18] MAGISTRADO: Fixo como ponto controvertido a culpa pela rescisão... [01:18 - 01:55] AUTOR (Mariana Ribeiro): Enviei três notificações extrajudiciais após expirar o prazo de 180 dias...'
),
(
    'b3333333-3333-3333-3333-333333333333',
    'a1111111-2222-3333-4444-555555555555',
    'JURISPRUDENCE',
    'STJ - Súmula 543 e Tema Repetitivo 1095',
    'STJ-S543',
    NULL,
    4500,
    TRUE,
    'Súmula 543/STJ: Na hipótese de resolução de contrato de promessa de compra e venda de imóvel submetido ao CDC, deve ocorrer a imediata restituição das parcelas pagas pelo promitente comprador - integralmente, em caso de culpa exclusiva do promitente vendedor/construtor.'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO tb_notebook_notes (id, notebook_id, title, content, note_type)
VALUES
(
    'c1111111-2222-3333-4444-555555555555',
    'a1111111-2222-3333-4444-555555555555',
    'Ponto Central: Culpa Exclusiva da Ré pelo Atraso',
    'A prova oral e a notificação de março/2023 corroboram a mora injustificada da construtora ré. Aplicação direta da Súmula 543 do STJ determinando restituição integral de 100%.',
    'FINDING'
)
ON CONFLICT (id) DO NOTHING;
