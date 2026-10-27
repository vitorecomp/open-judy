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
    engine_used VARCHAR(64) DEFAULT 'GEMINI-2.0-FLASH',
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

-- =========================================================================
-- SEED DATA: Judicial Cases, Hearings, Participants & Transcripts
-- =========================================================================

INSERT INTO tb_cases (id, case_number, court_jurisdiction, legal_branch, subject, plaintiff_name, defendant_name, judge_name, status)
VALUES
    ('c1000000-0000-0000-0000-000000000001', '0014238-19.2024.8.26.0100', '3ª Vara Cível Central - Comarca de São Paulo/SP', 'CIVIL', 'Rescisão Contratual c/c Indenização por Danos Morais e Materiais - Atraso de Obra Imobiliária', 'Mariana Ribeiro Fontes', 'Construtora Horizonte Sul S.A.', 'Dra. Camila Vasconcelos de Albuquerque', 'EM_ANDAMENTO'),
    ('c1000000-0000-0000-0000-000000000002', '1008942-55.2024.8.26.0100', '3ª Vara Cível Central - Comarca de São Paulo/SP', 'CIVIL', 'Obrigação de Fazer c/c Tutela de Urgência - Cobertura de Tratamento Oncológico', 'Roberto Carlos Mendes', 'Operadora Vida Plena Saúde S.A.', 'Dra. Camila Vasconcelos de Albuquerque', 'EM_ANDAMENTO'),
    ('c1000000-0000-0000-0000-000000000003', '1502391-88.2023.8.26.0050', '12ª Vara Criminal - Foro Central Criminal Barra Funda/SP', 'CRIMINAL', 'Estelionato Digital e Fraude Bancária Estruturada (Art. 171, § 2º-A, CP)', 'Ministério Público do Estado de São Paulo', 'Eduardo Henrique Mota', 'Dr. Fernando Augusto Silveira', 'EM_ANDAMENTO'),
    ('c1000000-0000-0000-0000-000000000004', '0003912-40.2024.5.02.0014', '14ª Vara do Trabalho de São Paulo - TRT-2', 'TRABALHISTA', 'Reconhecimento de Vínculo Empregatício, Horas Extras e Assédio Moral Organizacional', 'Juliana Martins Costa', 'Logística Expressa Brasil Ltda.', 'Dra. Helena Borges Prado', 'EM_ANDAMENTO'),
    ('c1000000-0000-0000-0000-000000000005', '0804119-72.2024.8.26.0100', '1ª Vara Empresarial e de Conflitos de Arbitragem - TJSP', 'EMPRESARIAL', 'Dissolução Parcial de Sociedade Anônima Fechada e Apuração de Haveres', 'Fundo Vanguarda Participações S.A.', 'TechNova Soluções Industriais Ltda.', 'Dr. Ricardo Paiva Neto', 'EM_ANDAMENTO')
ON CONFLICT DO NOTHING;

INSERT INTO tb_hearings (id, case_id, hearing_type, scheduled_date_time, status, media_type, audio_url, audio_filename, audio_duration_seconds, audio_size_bytes, media_url, media_filename, media_duration_seconds, media_size_bytes)
VALUES
    ('f1e2d3c4-b5a6-9788-7654-3210fedcba98', 'c1000000-0000-0000-0000-000000000001', 'INSTRUCAO_E_JULGAMENTO', '2025-02-24T14:00:00Z', 'COMPLETED', 'VIDEO', 's3://judy-hearings-bucket/hearings/0014238-19.2024.8.26.0100/audiencia-instrucao.mp4', 'audiencia-instrucao-0014238.mp4', 252.0, 48720192, 's3://judy-hearings-bucket/hearings/0014238-19.2024.8.26.0100/audiencia-instrucao.mp4', 'audiencia-instrucao-0014238.mp4', 252.0, 48720192),
    ('a2b3c4d5-e6f7-8901-2345-6789abcdef01', 'c1000000-0000-0000-0000-000000000002', 'CONCILIACAO', '2025-02-24T15:30:00Z', 'COMPLETED', 'VIDEO', 's3://judy-hearings-bucket/hearings/1008942-55.2024.8.26.0100/audiencia-conciliacao.mp4', 'audiencia-conciliacao-1008942.mp4', 1140.0, 29481200, 's3://judy-hearings-bucket/hearings/1008942-55.2024.8.26.0100/audiencia-conciliacao.mp4', 'audiencia-conciliacao-1008942.mp4', 1140.0, 29481200),
    ('11223344-5566-7788-99aa-bbccddeeff00', 'c1000000-0000-0000-0000-000000000003', 'INSTRUCAO_E_JULGAMENTO', '2025-02-24T16:30:00Z', 'TRANSCRIBING', 'VIDEO', 's3://judy-hearings-bucket/hearings/1502391-88.2023.8.26.0050/oitiva-testemunhas.mp4', 'oitiva-testemunhas-1502391.mp4', 3420.0, 82910400, 's3://judy-hearings-bucket/hearings/1502391-88.2023.8.26.0050/oitiva-testemunhas.mp4', 'oitiva-testemunhas-1502391.mp4', 3420.0, 82910400),
    ('99887766-5544-3322-1100-ffeeddccbbaa', 'c1000000-0000-0000-0000-000000000004', 'UNA', '2025-02-25T10:00:00Z', 'SCHEDULED', 'VIDEO', NULL, NULL, 0.0, 0, NULL, NULL, 0.0, 0),
    ('55443322-1100-9988-7766-554433221100', 'c1000000-0000-0000-0000-000000000005', 'SANEAMENTO', '2025-02-25T14:00:00Z', 'SCHEDULED', 'VIDEO', NULL, NULL, 0.0, 0, NULL, NULL, 0.0, 0)
ON CONFLICT DO NOTHING;

INSERT INTO tb_participants (id, case_id, hearing_id, name, role, document_number, email, is_present)
VALUES
    ('aa000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 'f1e2d3c4-b5a6-9788-7654-3210fedcba98', 'Dra. Camila Vasconcelos de Albuquerque', 'MAGISTRADO', 'TJSP-44910', 'camila.vasconcelos@tjsp.jus.br', TRUE),
    ('aa000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000001', 'f1e2d3c4-b5a6-9788-7654-3210fedcba98', 'Dr. Lucas Menezes Braga', 'ADVOGADO_AUTOR', 'OAB/SP 389.122', 'lucas.menezes@advocacia.com.br', TRUE),
    ('aa000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000001', 'f1e2d3c4-b5a6-9788-7654-3210fedcba98', 'Dra. Patrícia Nogueira Lima', 'ADVOGADO_REU', 'OAB/SP 274.910', 'patricia.lima@horizontesul.com.br', TRUE),
    ('aa000000-0000-0000-0000-000000000004', 'c1000000-0000-0000-0000-000000000001', 'f1e2d3c4-b5a6-9788-7654-3210fedcba98', 'Mariana Ribeiro Fontes', 'AUTOR', '318.492.118-90', 'mariana.fontes@email.com', TRUE),
    ('aa000000-0000-0000-0000-000000000005', 'c1000000-0000-0000-0000-000000000001', 'f1e2d3c4-b5a6-9788-7654-3210fedcba98', 'Eng. Carlos Eduardo Sampaio', 'TESTEMUNHA', 'CREA/SP 506189210', 'carlos.sampaio@engenharia.com.br', TRUE)
ON CONFLICT DO NOTHING;

INSERT INTO tb_transcripts (id, hearing_id, detected_language, total_segments, average_confidence, engine_used)
VALUES
    ('dd000000-0000-0000-0000-000000000001', 'f1e2d3c4-b5a6-9788-7654-3210fedcba98', 'pt-BR', 6, 0.985, 'GEMINI-2.0-FLASH')
ON CONFLICT DO NOTHING;

INSERT INTO tb_transcript_segments (id, transcript_id, segment_index, start_time_ms, end_time_ms, speaker_role, speaker_name, text, confidence_score, is_key_statement, topic_tag, block_index)
VALUES
    ('ee000000-0000-0000-0000-000000000001', 'dd000000-0000-0000-0000-000000000001', 1, 0, 18000, 'MAGISTRADO', 'Dra. Camila Vasconcelos (Juíza de Direito)', 'Boa tarde a todos. Declaro aberta a audiência de instrução e julgamento nos autos do processo nº 0014238-19.2024.8.26.0100. Registro a presença da autora, Sra. Mariana Ribeiro Fontes, acompanhada de seu patrono, Dr. Lucas Menezes, bem como da patrona da ré Construtora Horizonte Sul, Dra. Patrícia Nogueira. Questiono inicialmente às partes se há possibilidade de composição amigável.', 0.99, FALSE, 'ABERTURA_AUDIENCIA', 1),
    ('ee000000-0000-0000-0000-000000000002', 'dd000000-0000-0000-0000-000000000001', 2, 19000, 31000, 'ADVOGADO_AUTOR', 'Dr. Lucas Menezes (Advogado da Autora)', 'Excelência, pela parte autora, tentamos contato prévio, porém sem sucesso. Nossa cliente aguarda a entrega das chaves há mais de 14 meses além do prazo de tolerância e pleiteia a rescisão com devolução integral dos valores pagos, nos termos da Súmula 543 do STJ.', 0.98, TRUE, 'TENTATIVA_CONCILIACAO', 1),
    ('ee000000-0000-0000-0000-000000000003', 'dd000000-0000-0000-0000-000000000001', 3, 31500, 48000, 'ADVOGADO_REU', 'Dra. Patrícia Nogueira (Advogada da Ré)', 'Meritíssima, a ré mantém a proposta de retenção contratual de 20% a título de despesas administrativas, tendo em vista que o atraso decorreu de escassez de insumos no setor da construção civil e demora na expedição do Habite-se pela municipalidade.', 0.97, TRUE, 'DEFESA_CONSTRUTORA', 1),
    ('ee000000-0000-0000-0000-000000000004', 'dd000000-0000-0000-0000-000000000001', 4, 49000, 78000, 'MAGISTRADO', 'Dra. Camila Vasconcelos (Juíza de Direito)', 'Infrutífera a conciliação. Fixo como ponto controvertido a caracterização de culpa exclusiva da construtora pelo atraso na entrega do empreendimento e a data efetiva de comunicação da mora à consumidora. Passo à oitiva pessoal da autora, Sra. Mariana Ribeiro Fontes.', 0.99, FALSE, 'SANEAMENTO', 2),
    ('ee000000-0000-0000-0000-000000000005', 'dd000000-0000-0000-0000-000000000001', 5, 78500, 115000, 'AUTOR', 'Mariana Ribeiro Fontes (Autora)', 'Excelência, o prazo contratual de entrega era março de 2023, já contando os 180 dias de tolerância. Eu enviei três notificações extrajudiciais em abril, julho e outubro de 2023 solicitando posição da obra, e em todas me responderam que o prédio ainda estava em fase de acabamento interno. Enquanto isso, tive que continuar pagando aluguel de R$ 3.800,00 mensais.', 0.99, TRUE, 'DEPOIMENTO_PESSOAL_AUTORA', 2),
    ('ee000000-0000-0000-0000-000000000006', 'dd000000-0000-0000-0000-000000000001', 6, 116000, 252000, 'TESTEMUNHA', 'Eng. Carlos Eduardo Sampaio (Testemunha da Ré)', 'Senhora Juíza, atuei como engenheiro residente da obra. Confirmo que o pedido de vistoria para o Habite-se junto à Prefeitura somente foi protocolado pela construtora em janeiro de 2024, pois o cronograma de fachada e elevadores sofreu reprogramação interna da diretoria.', 0.98, TRUE, 'CONFISSAO_ATRASO_CRONOGRAMA', 3)
ON CONFLICT DO NOTHING;
