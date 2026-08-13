-- =========================================================================
-- Open Judy :: config-service Initial Database Schema & Seed Data
-- =========================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================================================================
-- 1. Prompt Templates (Prompts do Sistema: Atas, Contradições, Copilot, etc.)
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
    default_model VARCHAR(64) DEFAULT 'gemini-2.0-flash',
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

-- =========================================================================
-- 2. AI Models (Modelos LLM, Multimodais e Embeddings)
-- =========================================================================
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

-- =========================================================================
-- 3. Dashboard Types (Tipos de Dashboards Judiciais por Perfil)
-- =========================================================================
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

-- =========================================================================
-- 4. Notification Types (Tipos e Canais de Notificações do Sistema)
-- =========================================================================
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

-- =========================================================================
-- 5. System Settings (Configurações Globais Chave-Valor)
-- =========================================================================
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
-- SEED DATA: Prompt Templates
-- =========================================================================
INSERT INTO tb_prompt_templates (id, code, name, description, category, system_instruction, user_prompt_template, variables_json, default_model, default_temperature, default_max_tokens, version, active)
VALUES
(
    'b0000000-0000-0000-0000-000000000001',
    'PROMPT_ATA_GENERATION',
    'Geração Oficial de Ata de Audiência',
    'Gera o termo oficial da audiência judicial conforme normas do CPC/CPP e padrões dos Tribunais de Justiça.',
    'DOCUMENT_GENERATION',
    'Você é o assistente judiciário oficial do Open Judy especializado na elaboração formal de Atas de Audiências Judiciais do Poder Judiciário Brasileiro. Use terminologia jurídica precisa (CPC/CPP), tom formal, conciso e objetivo. Estruture a ata em: Cabeçalho com Vara e Comarca, Qualificação dos Presentes, Síntese Fidedigna dos Depoimentos e Oitivas com minutagem, Deliberações Judiciais e Despacho de Encerramento.',
    'Processo: {{case_number}}\nVara / Comarca: {{court_jurisdiction}}\nTipo de Audiência: {{hearing_type}}\nMagistrado Presidente: {{judge_name}}\nParticipantes Presentes: {{participants_list}}\n\nTranscrição Integral Diarizada da Audiência:\n{{transcript_content}}\n\nElabore a minuta completa do Termo de Audiência.',
    '["case_number","court_jurisdiction","hearing_type","judge_name","participants_list","transcript_content"]',
    'gemini-2.0-flash',
    0.2,
    8192,
    1,
    TRUE
),
(
    'b0000000-0000-0000-0000-000000000002',
    'PROMPT_CONTRADICTION_DETECTION',
    'Detector de Contradições e Teses Conflitantes',
    'Identifica divergências fáticas e contradições entre depoimentos de testemunhas, autor e réu com citações precisas.',
    'LEGAL_ANALYSIS',
    'Você é um auditor jurídico analítico do Open Judy. Analise minuciosamente os depoimentos colhidos na audiência e identifique pontos fáticos controvertidos, versões conflitantes entre testemunhas, contradições internas ou divergências com a petição inicial/contestação. Para cada contradição identificada, informe: 1) Fato Controvertido; 2) Declaração A (com orador e timestamp); 3) Declaração B (com orador e timestamp); 4) Relevância Jurídica e Súmulas/Jurisprudência correlatas.',
    'Processo Nº: {{case_number}}\nRamo do Direito: {{legal_branch}}\nTese do Autor: {{plaintiff_claim}}\nTese do Réu: {{defendant_claim}}\n\nTranscrição Segmentada:\n{{transcript_content}}\n\nIdentifique e liste detalhadamente todas as contradições fáticas e depoimentos dissonantes.',
    '["case_number","legal_branch","plaintiff_claim","defendant_claim","transcript_content"]',
    'gemini-2.0-flash',
    0.1,
    6144,
    1,
    TRUE
),
(
    'b0000000-0000-0000-0000-000000000003',
    'PROMPT_COPILOT_SYSTEM',
    'Copilot Judicial RAG com Links de Áudio',
    'Assistente interativo judiciário com busca semântica vetorial no AlloyDB pgvector e links de minutagem de áudio.',
    'COPILOT',
    'Você é Judy Copilot, a inteligência artificial do magistrado brasileiro. Responda às perguntas sobre os autos e a audiência estritamente com base nos trechos recuperados do AlloyDB pgvector. Sempre forneça citações diretas com marcadores de timestamp no formato [HH:MM:SS] ou [MM:SS] para permitir reprodução auditiva imediata no player. Seja neutro, técnico e direto.',
    'Contexto dos Autos e Depoimentos Recuperados:\n{{rag_context}}\n\nHistórico da Conversa:\n{{chat_history}}\n\nPergunta do Usuário:\n{{user_query}}',
    '["rag_context","chat_history","user_query"]',
    'gemini-2.0-flash',
    0.2,
    4096,
    1,
    TRUE
),
(
    'b0000000-0000-0000-0000-000000000004',
    'PROMPT_DIARIZATION_REFINEMENT',
    'Refinamento de Diarização de Falas Judiciais',
    'Classifica e refina a identificação de oradores na audiência em papéis jurídicos formais.',
    'TRANSCRIPTION',
    'Você é um classificador de papéis jurídicos em audiências. Analise o fluxo de diálogo e atribua a cada orador o seu papel correto: Magistrado(a), Promotor(a) de Justiça, Advogado(a) do Autor, Advogado(a) do Réu, Defensor(a) Público(a), Autor(a), Réu/Ré, Testemunha, Perito(a) ou Escrevente.',
    'Participantes Cadastrados na Pauta: {{registered_participants}}\n\nTrecho da Transcrição Bruta com Oradores Desconhecidos:\n{{raw_transcript}}\n\nClassifique os oradores mantendo rigorosamente os timestamps.',
    '["registered_participants","raw_transcript"]',
    'gemini-2.0-flash',
    0.1,
    4096,
    1,
    TRUE
),
(
    'b0000000-0000-0000-0000-000000000005',
    'PROMPT_LEGAL_SUMMARY',
    'Síntese Executiva de Audiência e Despachos',
    'Gera sumário executivo em tópicos claros com destaques das oitivas e próximas providências.',
    'SUMMARIZATION',
    'Você é um assistente judiciário encarregado de resumir objetivamente os acontecimentos cruciais de uma audiência judicial em até 300 palavras, com destaques para: 1) Matéria em discussão; 2) Síntese das oitivas; 3) Decisões interlocutórias tomadas; 4) Prazos e próximas providências.',
    'Processo: {{case_number}}\nTranscrição da Audiência:\n{{transcript_content}}\n\nGere o resumo executivo em tópicos.',
    '["case_number","transcript_content"]',
    'gemini-2.0-flash',
    0.2,
    2048,
    1,
    TRUE
)
ON CONFLICT (id) DO NOTHING;

-- =========================================================================
-- SEED DATA: AI Models
-- =========================================================================
INSERT INTO tb_ai_models (id, model_id, name, provider, model_type, description, context_window_tokens, max_output_tokens, supports_multimodal, supports_audio, supports_streaming, supports_system_instruction, cost_per_1k_input_tokens, cost_per_1k_output_tokens, is_default, active, parameters_json)
VALUES
(
    'a0000000-0000-0000-0000-000000000001',
    'gemini-2.0-flash',
    'Google Gemini 2.0 Flash',
    'GOOGLE_GEMINI',
    'LLM_MULTIMODAL',
    'Modelo multimodal de altíssima velocidade e janela de 1M tokens, ideal para transcrição de áudio, geração de atas e RAG.',
    1048576,
    8192,
    TRUE,
    TRUE,
    TRUE,
    TRUE,
    0.0001,
    0.0004,
    TRUE,
    TRUE,
    '{"temperature":0.2,"topP":0.95,"topK":40}'
),
(
    'a0000000-0000-0000-0000-000000000002',
    'gemini-1.5-pro',
    'Google Gemini 1.5 Pro',
    'GOOGLE_GEMINI',
    'LLM_MULTIMODAL',
    'Modelo de raciocínio profundo com 2M tokens de contexto para análise de processos complexos e contradições de grande porte.',
    2097152,
    8192,
    TRUE,
    TRUE,
    TRUE,
    TRUE,
    0.00125,
    0.005,
    FALSE,
    TRUE,
    '{"temperature":0.1,"topP":0.95,"topK":40}'
),
(
    'a0000000-0000-0000-0000-000000000003',
    'gemini-2.0-flash-lite',
    'Google Gemini 2.0 Flash Lite',
    'GOOGLE_GEMINI',
    'LLM_MULTIMODAL',
    'Modelo ultraleve e econômico para tarefas de classificação, diarização rápida e sínteses pontuais.',
    1048576,
    4096,
    TRUE,
    TRUE,
    TRUE,
    TRUE,
    0.000075,
    0.0003,
    FALSE,
    TRUE,
    '{"temperature":0.2,"topP":0.95}'
),
(
    'a0000000-0000-0000-0000-000000000004',
    'text-embedding-004',
    'Google Text Embedding 004',
    'GOOGLE_GEMINI',
    'EMBEDDING',
    'Modelo oficial de geração de embeddings vetoriais com 768 dimensões compatível com AlloyDB pgvector.',
    2048,
    768,
    FALSE,
    FALSE,
    FALSE,
    FALSE,
    0.00002,
    0.0,
    TRUE,
    TRUE,
    '{"dimensions":768,"taskType":"RETRIEVAL_DOCUMENT"}'
),
(
    'a0000000-0000-0000-0000-000000000005',
    'whisper-large-v3',
    'OpenAI Whisper Large v3',
    'LOCAL_OLLAMA',
    'AUDIO_SPEECH',
    'Modelo open-source de reconhecimento de fala e transcrição para ambientes on-premise ou fallback.',
    448,
    448,
    TRUE,
    TRUE,
    FALSE,
    FALSE,
    0.0,
    0.0,
    FALSE,
    TRUE,
    '{"language":"pt","temperature":0.0}'
)
ON CONFLICT (id) DO NOTHING;

-- =========================================================================
-- SEED DATA: Dashboard Types
-- =========================================================================
INSERT INTO tb_dashboard_types (id, code, name, description, target_role, layout_type, widgets_json, default_landing, active)
VALUES
(
    'd0000000-0000-0000-0000-000000000001',
    'DASHBOARD_MAGISTRADO',
    'Painel do Magistrado(a)',
    'Visão panorâmica para juízes com pauta de audiências do dia, atas aguardando assinatura digital e alertas de contradições.',
    'MAGISTRADO',
    'GRID',
    '[{"id":"widget_today_hearings","title":"Audiências de Hoje","type":"HEARING_LIST","colSpan":8,"rowSpan":2,"refreshSec":30},{"id":"widget_pending_signatures","title":"Atas Pendentes de Assinatura","type":"PENDING_MINUTES","colSpan":4,"rowSpan":2,"refreshSec":60},{"id":"widget_contradictions_alert","title":"Contradições Recentes Detectadas","type":"CONTRADICTION_SUMMARY","colSpan":6,"rowSpan":2,"refreshSec":120},{"id":"widget_productivity_stats","title":"Indicadores de Produtividade","type":"CHART_PRODUCTIVITY","colSpan":6,"rowSpan":2,"refreshSec":300}]',
    TRUE,
    TRUE
),
(
    'd0000000-0000-0000-0000-000000000002',
    'DASHBOARD_ASSESSOR',
    'Painel do Assessor de Gabinete',
    'Foco na redação de minutas de atas, pesquisa com Copilot RAG e revisão de depoimentos transcritos.',
    'ASSESSOR',
    'GRID',
    '[{"id":"widget_drafts_in_progress","title":"Minutas de Atas em Elaboração","type":"DRAFTS_LIST","colSpan":6,"rowSpan":2,"refreshSec":45},{"id":"widget_recent_transcriptions","title":"Transcrições Concluídas","type":"TRANSCRIPTION_FEED","colSpan":6,"rowSpan":2,"refreshSec":30},{"id":"widget_copilot_quick_search","title":"Pesquisa RAG em Depoimentos","type":"COPILOT_SHORTCUT","colSpan":12,"rowSpan":2,"refreshSec":0}]',
    TRUE,
    TRUE
),
(
    'd0000000-0000-0000-0000-000000000003',
    'DASHBOARD_SECRETARIA_VARA',
    'Painel da Secretaria de Vara / Cartório',
    'Controle operacional de pautas, ingestão e status de uploads de áudio/vídeo e notificações de partes.',
    'ALL',
    'GRID',
    '[{"id":"widget_calendar_hearings","title":"Calendário da Pauta Judicial","type":"CALENDAR_VIEW","colSpan":8,"rowSpan":3,"refreshSec":60},{"id":"widget_media_processing_queue","title":"Fila de Ingestão de Áudio S3/MinIO","type":"INGESTION_QUEUE","colSpan":4,"rowSpan":3,"refreshSec":15}]',
    FALSE,
    TRUE
),
(
    'd0000000-0000-0000-0000-000000000004',
    'DASHBOARD_ADMIN_METRICS',
    'Painel de Métricas e Administração de TI',
    'Telemetria de processamento de IA, latência do Gemini, custos estimados de tokens e saúde dos pods Quarkus.',
    'ADMIN',
    'GRID',
    '[{"id":"widget_gemini_latency","title":"Latência Média de Transcrição e RAG","type":"METRIC_LATENCY","colSpan":4,"rowSpan":1,"refreshSec":15},{"id":"widget_token_usage","title":"Consumo de Tokens Gemini 2.0","type":"METRIC_TOKENS","colSpan":4,"rowSpan":1,"refreshSec":30},{"id":"widget_storage_usage","title":"Armazenamento de Áudio MinIO/S3","type":"METRIC_STORAGE","colSpan":4,"rowSpan":1,"refreshSec":60},{"id":"widget_system_health","title":"Status dos Microsserviços e AlloyDB","type":"SYSTEM_HEALTH","colSpan":12,"rowSpan":2,"refreshSec":10}]',
    TRUE,
    TRUE
)
ON CONFLICT (id) DO NOTHING;

-- =========================================================================
-- SEED DATA: Notification Types
-- =========================================================================
INSERT INTO tb_notification_types (id, code, name, description, category, default_priority, supported_channels_json, template_title, template_body, allow_user_override, active)
VALUES
(
    'e0000000-0000-0000-0000-000000000001',
    'NOTIF_AUDIO_TRANSCRIPTION_COMPLETED',
    'Transcrição de Audiência Concluída',
    'Notifica quando o processamento e diarização de fala da audiência pelo Gemini é finalizado com sucesso.',
    'AUDIO_PROCESSING',
    'NORMAL',
    '["IN_APP","EMAIL","WEBSOCKET"]',
    'Transcrição concluída: Processo {{case_number}}',
    'A gravação da audiência do processo {{case_number}} foi transcrita e diarizada com sucesso em {{duration_formatted}}. A minuta da ata já pode ser gerada.',
    TRUE,
    TRUE
),
(
    'e0000000-0000-0000-0000-000000000002',
    'NOTIF_CONTRADICTION_DETECTED',
    'Contradição Relevante Detectada',
    'Alerta o magistrado e assessoria jurídica sobre depoimentos conflitantes ou teses contraditórias identificadas pela IA.',
    'LEGAL_ANALYSIS',
    'HIGH',
    '["IN_APP","EMAIL"]',
    'Alerta: Contradição detectada no processo {{case_number}}',
    'Foram encontradas {{contradiction_count}} divergência(s) relevante(s) entre os depoimentos colhidos no processo {{case_number}} ({{hearing_title}}). Clique para visualizar a análise detalhada.',
    TRUE,
    TRUE
),
(
    'e0000000-0000-0000-0000-000000000003',
    'NOTIF_ATA_DRAFT_READY',
    'Minuta da Ata de Audiência Disponível',
    'Avisa que a minuta automatizada do termo oficial de audiência foi gerada e está pronta para revisão.',
    'DOCUMENT_WORKFLOW',
    'NORMAL',
    '["IN_APP","WEBSOCKET"]',
    'Minuta da Ata Pronta: Processo {{case_number}}',
    'A minuta automática da ata de audiência do processo {{case_number}} foi elaborada pelo modelo {{gemini_model}} e está pronta para edição e aprovação.',
    TRUE,
    TRUE
),
(
    'e0000000-0000-0000-0000-000000000004',
    'NOTIF_SIGNATURE_REQUIRED',
    'Assinatura Digital ICP-Brasil Necessária',
    'Notifica o magistrado quando um termo de audiência aprovado aguarda assinatura eletrônica/digital.',
    'DOCUMENT_WORKFLOW',
    'HIGH',
    '["IN_APP","EMAIL"]',
    'Ata aguardando assinatura do Magistrado(a) - {{case_number}}',
    'O termo de audiência do processo {{case_number}} foi revisado pela assessoria e aguarda a assinatura digital de Vossa Excelência.',
    FALSE,
    TRUE
),
(
    'e0000000-0000-0000-0000-000000000005',
    'NOTIF_SECURITY_AUDIT_ALERT',
    'Alerta de Segurança e Acesso Zero Trust',
    'Notifica a equipe de administração sobre anomalias de acesso IAP, tentativas de exportação ou acessos não autorizados.',
    'SECURITY_AUDIT',
    'CRITICAL',
    '["IN_APP","EMAIL","WEBHOOK"]',
    'ALERTA DE SEGURANÇA: Evento anômalo em {{resource_name}}',
    'Foi detectado um evento de segurança em {{timestamp}}: {{audit_description}}. Endereço IP: {{ip_address}}.',
    FALSE,
    TRUE
),
(
    'e0000000-0000-0000-0000-000000000006',
    'NOTIF_SYSTEM_MAINTENANCE',
    'Aviso de Manutenção Programada',
    'Comunicação geral aos usuários sobre janelas de manutenção e atualização da plataforma Open Judy.',
    'SYSTEM',
    'NORMAL',
    '["IN_APP","EMAIL"]',
    'Aviso: Manutenção programada do Open Judy em {{scheduled_date}}',
    'O ecossistema Open Judy passará por manutenção para atualização dos modelos de IA no dia {{scheduled_date}} das {{start_time}} às {{end_time}}.',
    TRUE,
    TRUE
)
ON CONFLICT (id) DO NOTHING;

-- =========================================================================
-- SEED DATA: System Settings
-- =========================================================================
INSERT INTO tb_system_settings (id, category, setting_key, setting_value, value_type, description, is_secret, is_read_only)
VALUES
(
    'f0000000-0000-0000-0000-000000000001',
    'AI_CORE',
    'gemini.default.model',
    'gemini-2.0-flash',
    'STRING',
    'Modelo padrão do Google Gemini para transcrição de áudio, geração de atas e copilot.',
    FALSE,
    FALSE
),
(
    'f0000000-0000-0000-0000-000000000002',
    'AI_CORE',
    'gemini.default.embedding_model',
    'text-embedding-004',
    'STRING',
    'Modelo padrão para geração de embeddings vetoriais com 768 dimensões.',
    FALSE,
    FALSE
),
(
    'f0000000-0000-0000-0000-000000000003',
    'AI_CORE',
    'vector.similarity_threshold',
    '0.75',
    'DOUBLE',
    'Limiar mínimo de similaridade de cosseno para recuperação no AlloyDB pgvector.',
    FALSE,
    FALSE
),
(
    'f0000000-0000-0000-0000-000000000004',
    'AUDIO_PIPELINE',
    'audio.max_duration_minutes',
    '240',
    'INTEGER',
    'Duração máxima permitida para arquivo individual de audiência em minutos.',
    FALSE,
    FALSE
),
(
    'f0000000-0000-0000-0000-000000000005',
    'STORAGE',
    'storage.audio_bucket',
    'open-judy-audio-archive',
    'STRING',
    'Bucket S3/MinIO para armazenamento seguro de gravações judiciais.',
    FALSE,
    FALSE
),
(
    'f0000000-0000-0000-0000-000000000006',
    'SECURITY',
    'security.zero_trust_enforced',
    'true',
    'BOOLEAN',
    'Habilita validação estrita de tokens IAP e permissões baseadas em perfis judiciais.',
    FALSE,
    FALSE
),
(
    'f0000000-0000-0000-0000-000000000007',
    'SECURITY',
    'security.audit_retention_days',
    '365',
    'INTEGER',
    'Período de retenção de registros de auditoria em dias (conformidade CNJ).',
    FALSE,
    FALSE
),
(
    'f0000000-0000-0000-0000-000000000008',
    'GENERAL',
    'system.maintenance_mode',
    'false',
    'BOOLEAN',
    'Coloca o sistema em modo de manutenção bloqueando novas ingestões.',
    FALSE,
    FALSE
),
(
    'f0000000-0000-0000-0000-000000000009',
    'GENERAL',
    'system.default_language',
    'pt-BR',
    'STRING',
    'Idioma padrão da interface e das instruções dos prompts.',
    FALSE,
    FALSE
),
(
    'f0000000-0000-0000-0000-000000000010',
    'AI_CORE',
    'copilot.max_history_turns',
    '20',
    'INTEGER',
    'Número máximo de turnos de diálogo mantidos no contexto conversacional do Copilot.',
    FALSE,
    FALSE
),
(
    'f0000000-0000-0000-0000-000000000011',
    'GENERAL',
    'system.name',
    'Open Judy',
    'STRING',
    'Nome oficial de exibição do sistema na interface, cabeçalhos e documentos.',
    FALSE,
    FALSE
),
(
    'f0000000-0000-0000-0000-000000000012',
    'GENERAL',
    'system.tagline',
    'IA Judiciária Zero-Trust',
    'STRING',
    'Slogan ou subtítulo institucional exibido abaixo do nome do sistema.',
    FALSE,
    FALSE
),
(
    'f0000000-0000-0000-0000-000000000013',
    'GENERAL',
    'system.logo_url',
    '',
    'STRING',
    'URL da imagem da logo do sistema (ex: PNG, SVG ou HTTPS). Quando vazio, utiliza o ícone padrão.',
    FALSE,
    FALSE
),
(
    'f0000000-0000-0000-0000-000000000014',
    'GENERAL',
    'system.accent_color',
    '#e63946',
    'STRING',
    'Cor de destaque visual do sistema (Teal: #0d9488, Red: #e63946, Orange: #ea580c ou HEX personalizado).',
    FALSE,
    FALSE
),
(
    'f0000000-0000-0000-0000-000000000015',
    'AUDIO_PIPELINE',
    'pipeline.transcription.max_retries',
    '3',
    'INTEGER',
    'Número máximo de tentativas automáticas de reprocessamento em caso de falha transitória na transcrição.',
    FALSE,
    FALSE
),
(
    'f0000000-0000-0000-0000-000000000016',
    'AUDIO_PIPELINE',
    'pipeline.retry_backoff_seconds',
    '5',
    'INTEGER',
    'Tempo base em segundos para recuo exponencial (backoff) entre tentativas de reprocessamento no RabbitMQ.',
    FALSE,
    FALSE
)
ON CONFLICT (id) DO NOTHING;
