-- =========================================================================
-- Open Judy :: 256k Token Multimodal Video/Audio Blocks Table
-- =========================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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

ALTER TABLE tb_transcript_segments ADD COLUMN IF NOT EXISTS block_id UUID REFERENCES tb_transcript_blocks(id) ON DELETE SET NULL;
ALTER TABLE tb_transcript_segments ADD COLUMN IF NOT EXISTS block_index INT DEFAULT 1;

-- Seed Demo Multimodal 256k Token Blocks for Hearing f1e2d3c4-b5a6-9788-7654-3210fedcba98
INSERT INTO tb_transcript_blocks (id, hearing_id, block_index, title, start_time_ms, end_time_ms, start_time_formatted, end_time_formatted, estimated_tokens, segment_count, summary)
VALUES
    ('bb000000-0000-0000-0000-000000000001', 'f1e2d3c4-b5a6-9788-7654-3210fedcba98', 1, 'Bloco 1: Abertura e Tentativa de Conciliação', 0, 48000, '00:00', '00:48', 252000, 3, 'Abertura da audiência pela Magistrada, tentativa infrutífera de conciliação e exposição das teses iniciais (Súmula 543/STJ vs retenção de 20%).'),
    ('bb000000-0000-0000-0000-000000000002', 'f1e2d3c4-b5a6-9788-7654-3210fedcba98', 2, 'Bloco 2: Saneamento e Depoimento Pessoal da Autora', 49000, 115000, '00:49', '01:55', 256000, 2, 'Fixação dos pontos controvertidos e depoimento pessoal da autora Mariana Ribeiro Fontes sobre as notificações extrajudiciais e gastos com aluguel.'),
    ('bb000000-0000-0000-0000-000000000003', 'f1e2d3c4-b5a6-9788-7654-3210fedcba98', 3, 'Bloco 3: Oitiva da Testemunha e Encerramento', 116000, 252000, '01:56', '04:12', 248000, 1, 'Oitiva do engenheiro residente confirmando que o Habite-se só foi requerido em janeiro de 2024 por reprogramação interna da construtora.')
ON CONFLICT DO NOTHING;

UPDATE tb_transcript_segments
SET block_id = tb_transcript_blocks.id
FROM tb_transcript_blocks
WHERE tb_transcript_segments.transcript_id = 'dd000000-0000-0000-0000-000000000001'
  AND tb_transcript_blocks.hearing_id = 'f1e2d3c4-b5a6-9788-7654-3210fedcba98'
  AND tb_transcript_segments.block_index = tb_transcript_blocks.block_index
  AND tb_transcript_segments.block_id IS NULL;

