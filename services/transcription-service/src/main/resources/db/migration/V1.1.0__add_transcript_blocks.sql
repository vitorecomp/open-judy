-- =========================================================================
-- Open Judy :: 256k Token Multimodal Video/Audio Blocks Table
-- =========================================================================

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
