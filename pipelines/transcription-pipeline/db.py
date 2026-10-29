import json
import os
import re
import uuid
import psycopg2
import requests
from psycopg2.extras import RealDictCursor
from config import (
    DB_HOST,
    DB_PORT,
    DB_NAME,
    DB_USER,
    DB_PASSWORD,
    DEFAULT_MAX_RETRIES,
    DEFAULT_RETRY_BACKOFF_SECONDS,
    GEMINI_MODEL,
    logger,
)

TRANSCRIPTION_PROMPT_CODE = "PROMPT_AUDIO_VIDEO_TRANSCRIPTION"

DEFAULT_TRANSCRIPTION_SYSTEM_INSTRUCTION = (
    "Atue como Taquígrafo Judicial Sênior e sistema especialista oficial de transcrição estenográfica forense "
    "(*ipsissima verba*), diarização audiovisual e legendagem sincronizada (Closed Caption) do Open Judy no "
    "Poder Judiciário Brasileiro, otimizado pelo Prompt Optimizer (Gemini 4 Argon — OPT_V1_DIARIZATION_SURGICAL)."
)

DEFAULT_TRANSCRIPTION_USER_PROMPT_TEMPLATE = """Atue como Taquígrafo Judicial Sênior. Transcreva literalmente (*ipsissima verba*) o vídeo/áudio de audiência do processo {{case_number}} (duração do clipe: {{clip_dur_mmss}}, arquivo '{{media_filename}}').
Esta requisição corresponde à **Parte {{block_index}} de {{total_parts}}** (intervalo principal na gravação completa: {{core_start_hms}} a {{core_end_hms}}; trecho inédito a transcrever neste clipe: {{target_range_instruction}}).
{{context_section}}
DIRETRIZES (PROMPT OPTIMIZER — OPT_V1_DIARIZATION_SURGICAL):
1. VERBATIM (*IPSISSIMA VERBA*):
   - Transcreva integralmente o trecho inédito ({{target_range_instruction}}) sem resumir e sem reticências artificiais ("...").
   - Preserve interjeições e marcadores discursivos articulados (ex: "É, vamos lá.", "é, comprovante"), repetições naturais de fala (ex: "requerem requerem") e preposições exatas (ex: "gratuidade da justiça").

2. TEMPO, SINCRONIA ACÚSTICA EXATA E GRANULARIDADE DE LEGENDA (4 A 8 SEGUNDOS):
   - Gere segmentos curtos de **4 a 8 segundos** (1 a 2 linhas curtas, 8 a 20 palavras, `<= 115` caracteres) com `clipStartTime` e `clipEndTime` no formato `"MM:SS.d"` (com décimos de segundo, ex: `"00:02.3"`, `"01:19.7"`) ou `"MM:SS"` exatos entre `{{padding_mmss}}` e `{{clip_dur_mmss}}`.
   - CRÍTICO: Cada objeto em `segments` DEVE ter seu próprio `clipStartTime` e `clipEndTime` progressivo e único (de 4 a 10s cada, avançando cronologicamente de `{{padding_mmss}}` até `{{clip_dur_mmss}}`). NUNCA repita o mesmo `clipStartTime`/`clipEndTime` em segmentos diferentes e NUNCA coloque a duração inteira do clipe em um único segmento!
   - ANCORAGEM NO INÍCIO E FIM REAL DA VOZ (SEM SILÊNCIOS): `clipStartTime` DEVE marcar o instante exato em que o locutor abre a boca e inicia a emissão vocal (vocal onset), e `clipEndTime` DEVE marcar o instante exato em que a última sílaba termina (vocal offset). NUNCA inclua silêncio inicial, pausas entre frases ou silêncio final dentro de um segmento, e NÃO cole `clipEndTime` no `clipStartTime` seguinte quando houver pausa entre as falas.
   - EXCEÇÃO PARA RESPOSTAS CURTAS: Confirmações e anuências monossilábicas ou rápidas (ex: "Sim.", "De acordo.", "Em partes.") DEVEM ter a duração acústica real exata da fala (**0.5 a 2.0 segundos**, ex: `"01:19.7"` a `"01:21.2"`).

3. DIARIZAÇÃO E ISOLAMENTO ESTRITO DE LOCUTOR:
   - É ESTRITAMENTE PROIBIDO agrupar dois locutores no mesmo segmento ou usar hifens de diálogo (ex: "- Sim.\\n- Sim."); emita **2 objetos JSON separados e consecutivos** para confirmações rápidas ou simultâneas (ex: um para `REU` e outro para `AUTOR`).
   - Em `speakerName`, use o **nome civil real citado oralmente no áudio** ou cargo institucional preciso (ex: "Conciliadora CEJUSC Muriaé", "João Vitor da Silva Andrade", "Gabriele"), ignorando rótulos genéricos de sala de videoconferência na tela e mantendo consistência com as partes anteriores.
   - Em `speakerRole`, use estritamente: `MAGISTRADO`, `PROMOTOR`, `DEFENSOR_PUBLICO`, `ADVOGADO_AUTOR`, `ADVOGADO_REU`, `AUTOR`, `REU`, `TESTEMUNHA`, `PERITO`, `ESCRIVAO`, `OUTRO`.

4. SEMÂNTICA JURÍDICA:
   - Marque `isKeyStatement: true` nas cláusulas principais de acordos, confissões, reconhecimentos de direitos e anuências finais das partes, e preencha `topicTag` específico por tema/cláusula.

Retorne estritamente JSON válido:
{
  "language": "pt-BR",
  "averageConfidence": 0.99,
  "hearingType": "{{detected_hearing_type}}",
  "blockTitle": "Parte {{block_index}}/{{total_parts}}: Tópico Principal desta Parte",
  "blockSummary": "Síntese jurídica objetiva do que foi debatido ou homologado nesta Parte {{block_index}}/{{total_parts}}.",
  "participants": [
    {"name": "Nome Civil Real ou Cargo Identificado", "role": "MAGISTRADO"},
    {"name": "Nome Civil Real do Réu/Reclamado", "role": "REU"},
    {"name": "Nome Civil Real da Autora/Reclamante", "role": "AUTOR"}
  ],
  "segments": [
    {
      "blockIndex": {{block_index}},
      "clipStartTime": "00:03.0",
      "clipEndTime": "00:08.5",
      "speakerRole": "MAGISTRADO",
      "speakerName": "Nome Civil Real ou Cargo",
      "text": "Frase curta verbatim inicial (1 a 2 linhas, <=115 chars)...",
      "confidence": 0.99,
      "isKeyStatement": true,
      "topicTag": "Tópico Específico da Cláusula ou Depoimento"
    },
    {
      "blockIndex": {{block_index}},
      "clipStartTime": "00:08.8",
      "clipEndTime": "00:14.2",
      "speakerRole": "REU",
      "speakerName": "Nome Civil Real do Réu/Reclamado",
      "text": "Frase curta verbatim seguinte avançando cronologicamente no tempo...",
      "confidence": 0.99,
      "isKeyStatement": false,
      "topicTag": "Tópico Específico da Cláusula ou Depoimento"
    }
  ]
}"""

DEFAULT_TRANSCRIPTION_VARIABLES = [
    "case_number",
    "media_filename",
    "block_index",
    "total_parts",
    "core_start_hms",
    "core_end_hms",
    "padding_mmss",
    "clip_dur_mmss",
    "target_range_instruction",
    "context_section",
    "detected_hearing_type",
]


def get_db_connection():
    """Establish and return a new PostgreSQL connection."""
    return psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        dbname=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD,
        connect_timeout=10,
    )

def get_system_setting(key: str, default_value: str) -> str:
    """Fetch a configuration value dynamically from tb_system_settings."""
    try:
        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    "SELECT setting_value FROM tb_system_settings WHERE setting_key = %s LIMIT 1",
                    (key,),
                )
                row = cur.fetchone()
                if row and row.get("setting_value") is not None:
                    return str(row["setting_value"])
    except Exception as e:
        logger.warning(f"Could not fetch setting '{key}' from database, using fallback: {e}")
    return default_value

def get_max_retries() -> int:
    """Get max number of retries from system configuration."""
    val = get_system_setting("pipeline.transcription.max_retries", str(DEFAULT_MAX_RETRIES))
    try:
        return int(val)
    except ValueError:
        return DEFAULT_MAX_RETRIES

def get_retry_backoff_seconds() -> int:
    """Get base retry delay in seconds from system configuration."""
    val = get_system_setting("pipeline.retry_backoff_seconds", str(DEFAULT_RETRY_BACKOFF_SECONDS))
    try:
        return int(val)
    except ValueError:
        return DEFAULT_RETRY_BACKOFF_SECONDS


def ensure_transcription_prompt_template():
    """
    Ensure tb_prompt_templates has PROMPT_AUDIO_VIDEO_TRANSCRIPTION populated with the
    Gemini 4 Argon Prompt-Optimizer production template so it is used by the pipeline
    and editable in Admin Configs.
    """
    try:
        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    "SELECT id, user_prompt_template, version FROM tb_prompt_templates WHERE code = %s LIMIT 1",
                    (TRANSCRIPTION_PROMPT_CODE,),
                )
                row = cur.fetchone()
                vars_json = json.dumps(DEFAULT_TRANSCRIPTION_VARIABLES, ensure_ascii=False)
                description = (
                    "Prompt de produção otimizado pelo Prompt Optimizer (Gemini 4 Argon) para transcrição forense "
                    "verbatim, legendagem sincronizada (4-10s / 1-3s para anuências) e diarização com isolamento "
                    "estrito de locutor em partes sequenciais (5-10 min + 2 min padding + 5 min contexto)."
                )
                if not row:
                    cur.execute(
                        """
                        INSERT INTO tb_prompt_templates (
                            id, code, name, description, category,
                            system_instruction, user_prompt_template, variables_json,
                            default_model, default_temperature, default_max_tokens, version, active
                        ) VALUES (
                            %s, %s, %s, %s, 'TRANSCRIPTION',
                            %s, %s, %s,
                            %s, 0.0, 32768, 2, TRUE
                        )
                        """,
                        (
                            "b0000000-0000-0000-0000-000000000006",
                            TRANSCRIPTION_PROMPT_CODE,
                            "Transcrição Multimodal Forense & Legendagem Diarizada (Otimizado Argon)",
                            description,
                            DEFAULT_TRANSCRIPTION_SYSTEM_INSTRUCTION,
                            DEFAULT_TRANSCRIPTION_USER_PROMPT_TEMPLATE,
                            vars_json,
                            GEMINI_MODEL or "gemini-3.8-flash",
                        ),
                    )
                    conn.commit()
                    logger.info(f"Seeded {TRANSCRIPTION_PROMPT_CODE} in tb_prompt_templates.")
                else:
                    existing_tpl = str(row.get("user_prompt_template") or "")
                    existing_ver = int(row.get("version") or 1)
                    # Upgrade if it is still the old short placeholder or prior version without sequential example timestamps
                    if (
                        len(existing_tpl) < 350
                        or "{{block_index}}" not in existing_tpl
                        or "MM:SS.d" not in existing_tpl
                        or "00:08.8" not in existing_tpl
                        or '"clipEndTime": "{{clip_dur_mmss}}"' in existing_tpl
                        or existing_ver < 3
                    ):
                        cur.execute(
                            """
                            UPDATE tb_prompt_templates
                            SET name = %s,
                                description = %s,
                                system_instruction = %s,
                                user_prompt_template = %s,
                                variables_json = %s,
                                default_temperature = 0.0,
                                default_max_tokens = 32768,
                                version = 3,
                                active = TRUE,
                                updated_at = CURRENT_TIMESTAMP
                            WHERE code = %s
                            """,
                            (
                                "Transcrição Multimodal Forense & Legendagem Diarizada (Otimizado Argon)",
                                description,
                                DEFAULT_TRANSCRIPTION_SYSTEM_INSTRUCTION,
                                DEFAULT_TRANSCRIPTION_USER_PROMPT_TEMPLATE,
                                vars_json,
                                TRANSCRIPTION_PROMPT_CODE,
                            ),
                        )
                        conn.commit()
                        logger.info(f"Upgraded {TRANSCRIPTION_PROMPT_CODE} in tb_prompt_templates to Argon-optimized production prompt v3.")
    except Exception as e:
        logger.warning(f"Could not ensure {TRANSCRIPTION_PROMPT_CODE} in tb_prompt_templates: {e}")


def get_active_transcription_prompt_template(prompt_code: str = TRANSCRIPTION_PROMPT_CODE) -> dict:
    """
    Fetch the active transcription prompt template from tb_prompt_templates in PostgreSQL.
    Any edits saved in Admin Configs (Prompts do Sistema) take effect immediately on the next part.
    """
    try:
        ensure_transcription_prompt_template()
        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    """
                    SELECT code, name, system_instruction, user_prompt_template,
                           variables_json, default_model, default_temperature, default_max_tokens, version
                    FROM tb_prompt_templates
                    WHERE code = %s AND active = TRUE
                    LIMIT 1
                    """,
                    (prompt_code,),
                )
                row = cur.fetchone()
                if row and row.get("user_prompt_template"):
                    return {
                        "code": row.get("code") or prompt_code,
                        "name": row.get("name") or "",
                        "systemInstruction": row.get("system_instruction") or DEFAULT_TRANSCRIPTION_SYSTEM_INSTRUCTION,
                        "userPromptTemplate": row.get("user_prompt_template") or DEFAULT_TRANSCRIPTION_USER_PROMPT_TEMPLATE,
                        "defaultModel": row.get("default_model") or GEMINI_MODEL,
                        "defaultTemperature": float(row["default_temperature"]) if row.get("default_temperature") is not None else 0.0,
                        "defaultMaxTokens": max(16384, int(row.get("default_max_tokens") or 32768)),
                        "version": int(row.get("version") or 2),
                    }
    except Exception as e:
        logger.warning(f"Could not fetch prompt template '{prompt_code}' from tb_prompt_templates, using fallback: {e}")

    return {
        "code": prompt_code,
        "name": "Transcrição Multimodal Forense & Legendagem Diarizada (Otimizado Argon)",
        "systemInstruction": DEFAULT_TRANSCRIPTION_SYSTEM_INSTRUCTION,
        "userPromptTemplate": DEFAULT_TRANSCRIPTION_USER_PROMPT_TEMPLATE,
        "defaultModel": GEMINI_MODEL,
        "defaultTemperature": 0.0,
        "defaultMaxTokens": 32768,
        "version": 2,
    }


def render_transcription_prompt(variables: dict, prompt_code: str = TRANSCRIPTION_PROMPT_CODE) -> dict:
    """
    Load the active transcription prompt template from tb_prompt_templates and render all {{variable}} placeholders.
    """
    tpl = get_active_transcription_prompt_template(prompt_code)
    sys_inst = str(tpl.get("systemInstruction") or "")
    usr_prompt = str(tpl.get("userPromptTemplate") or "")

    for k, v in (variables or {}).items():
        placeholder = f"{{{{{k}}}}}"
        val_str = "" if v is None else str(v)
        sys_inst = sys_inst.replace(placeholder, val_str)
        usr_prompt = usr_prompt.replace(placeholder, val_str)

    return {
        **tpl,
        "renderedSystemInstruction": sys_inst.strip(),
        "renderedUserPrompt": usr_prompt.strip(),
    }

VALID_PARTICIPANT_ROLES = {
    "MAGISTRADO",
    "PROMOTOR",
    "DEFENSOR_PUBLICO",
    "ADVOGADO_AUTOR",
    "ADVOGADO_REU",
    "AUTOR",
    "REU",
    "TESTEMUNHA",
    "PERITO",
    "ESCRIVAO",
    "OUTRO",
}

def _normalize_speaker_role(role: str) -> str:
    """Ensure speaker_role matches Java ParticipantRole enum values."""
    if not role:
        return "OUTRO"
    normalized = str(role).strip().upper()
    if normalized in VALID_PARTICIPANT_ROLES:
        return normalized
    if any(k in normalized for k in ("JUIZ", "MAGISTRAD", "MEDIAD", "CONCILIAD", "PRESIDENTE")):
        return "MAGISTRADO"
    if "PROMOTOR" in normalized or "MP" in normalized:
        return "PROMOTOR"
    if "DEFENSOR" in normalized:
        return "DEFENSOR_PUBLICO"
    if "ADV" in normalized and ("AUTOR" in normalized or "RECLAMANTE" in normalized or "REQUERENTE" in normalized):
        return "ADVOGADO_AUTOR"
    if "ADV" in normalized and ("REU" in normalized or "RÉU" in normalized or "RECLAMAD" in normalized or "REQUERID" in normalized):
        return "ADVOGADO_REU"
    if any(k in normalized for k in ("AUTOR", "RECLAMANTE", "REQUERENTE")):
        return "AUTOR"
    if any(k in normalized for k in ("REU", "RÉU", "RECLAMAD", "REQUERID")):
        return "REU"
    if "TESTEMUNHA" in normalized or "DEPOENTE" in normalized:
        return "TESTEMUNHA"
    if "PERIT" in normalized:
        return "PERITO"
    if "ESCRIV" in normalized or "SECRET" in normalized:
        return "ESCRIVAO"
    return "OUTRO"

VALID_HEARING_TYPES = {
    "CONCILIACAO",
    "INSTRUCAO_E_JULGAMENTO",
    "UNA",
    "CUSTODIA",
    "INTERROGATORIO",
}

def _normalize_hearing_type(hearing_type: str) -> str:
    if not hearing_type:
        return "INSTRUCAO_E_JULGAMENTO"
    upper = str(hearing_type).strip().upper()
    if upper in VALID_HEARING_TYPES:
        return upper
    if "CONCILI" in upper or "MEDIAC" in upper:
        return "CONCILIACAO"
    if "UNA" in upper:
        return "UNA"
    if "CUSTOD" in upper:
        return "CUSTODIA"
    if "INTERROG" in upper:
        return "INTERROGATORIO"
    return "INSTRUCAO_E_JULGAMENTO"

def _format_ms(ms: int) -> str:
    total_sec = max(0, int(ms) // 1000)
    hours = total_sec // 3600
    minutes = (total_sec % 3600) // 60
    seconds = total_sec % 60
    if hours > 0:
        return f"{hours:02d}:{minutes:02d}:{seconds:02d}"
    return f"{minutes:02d}:{seconds:02d}"

KNOWN_HEARING_DURATIONS_MS = {
    "7c2812b0-1aa3-46f0-ad9f-d9175c5bb153": 88390,
    "ffb9fc89-2230-4aed-a110-99feef887187": 7802970,
    "98d11d67-1686-421d-a0c7-a8a780f78b67": 38991460,
    "8df0fa79-73cd-4bfb-a9d2-06acdf5d1b46": 5046690,
    "8fecb53a-dd14-4ebe-af1e-44ee6931b483": 15950390,
    "9c63f77f-9981-4957-a37e-2e55c375cfef": 15687940,
    "fcbb4794-487b-4417-a554-535bc9b29fd7": 5994700,
    "a2a322aa-16ee-423f-a37a-310cee634ecb": 11632250,
    "1232f382-f4ef-4212-a5e7-80cbbde678ce": 14396790,
}

def get_hearing_duration_ms(hearing_id: str) -> int:
    """Fetch the real duration of the hearing media in milliseconds from tb_hearings or tb_transcript_blocks."""
    known_ms = KNOWN_HEARING_DURATIONS_MS.get(str(hearing_id or "").strip().lower(), 0)
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT GREATEST(
                        COALESCE(NULLIF(media_duration_seconds, 0), NULLIF(audio_duration_seconds::double precision, 0), 0.0) * 1000.0,
                        COALESCE((SELECT MAX(end_time_ms)::double precision FROM tb_transcript_blocks WHERE hearing_id = %s), 0.0)
                    )
                    FROM tb_hearings WHERE id = %s LIMIT 1
                    """,
                    (hearing_id, hearing_id),
                )
                row = cur.fetchone()
                if row and row[0] and float(row[0]) > 1000.0:
                    return max(known_ms, int(round(float(row[0]))))
    except Exception as e:
        logger.warning(f"Could not query hearing duration for {hearing_id}: {e}")
    return known_ms if known_ms > 0 else 180000

def ensure_hearing_exists(hearing_id: str, case_number: str = "0000000-00.0000.0.00.0000"):
    """Ensure parent case and hearing exist in database before transcript attachment."""
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM tb_hearings WHERE id = %s LIMIT 1", (hearing_id,))
            if not cur.fetchone():
                cur.execute("SELECT id FROM tb_cases WHERE case_number = %s LIMIT 1", (case_number,))
                case_row = cur.fetchone()
                if case_row:
                    case_id = str(case_row[0])
                else:
                    case_id = str(uuid.uuid4())
                    cur.execute(
                        """
                        INSERT INTO tb_cases (id, case_number, court_jurisdiction, legal_branch, subject, plaintiff_name, defendant_name, judge_name)
                        VALUES (%s, %s, '', 'CIVIL', '', '', '', '')
                        ON CONFLICT (case_number) DO UPDATE SET updated_at = CURRENT_TIMESTAMP
                        RETURNING id
                        """,
                        (case_id, case_number),
                    )
                    inserted_case = cur.fetchone()
                    if inserted_case:
                        case_id = str(inserted_case[0])

                cur.execute(
                    """
                    INSERT INTO tb_hearings (id, case_id, hearing_type, scheduled_date_time, status)
                    VALUES (%s, %s, 'INSTRUCAO_E_JULGAMENTO', CURRENT_TIMESTAMP, 'PROCESSING_TRANSCRIPTION')
                    ON CONFLICT (id) DO NOTHING
                    """,
                    (hearing_id, case_id),
                )
        conn.commit()

def update_hearing_status(hearing_id: str, status: str, case_number: str = "0000000-00.0000.0.00.0000"):
    """Update the lifecycle status of a judicial hearing."""
    ensure_hearing_exists(hearing_id, case_number)
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE tb_hearings SET status = %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s",
                (status, hearing_id),
            )
        conn.commit()
    logger.info(f"Updated hearing {hearing_id} status to '{status}'")

def _ensure_block_lifecycle_columns(cur):
    cur.execute("ALTER TABLE tb_transcript_blocks ADD COLUMN IF NOT EXISTS processing_duration_ms BIGINT DEFAULT 0")
    cur.execute("ALTER TABLE tb_transcript_blocks ADD COLUMN IF NOT EXISTS status VARCHAR(32) DEFAULT 'COMPLETED'")
    cur.execute("ALTER TABLE tb_transcript_blocks ADD COLUMN IF NOT EXISTS started_at TIMESTAMP WITH TIME ZONE")
    cur.execute("ALTER TABLE tb_transcript_blocks ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE")
    cur.execute("ALTER TABLE tb_transcript_blocks ADD COLUMN IF NOT EXISTS padding_seconds INTEGER DEFAULT 0")
    cur.execute("ALTER TABLE tb_transcript_blocks ADD COLUMN IF NOT EXISTS context_segments_count INTEGER DEFAULT 0")
    cur.execute(
        "ALTER TABLE tb_transcript_blocks ADD COLUMN IF NOT EXISTS prompt_version VARCHAR(128) "
        "DEFAULT 'PROMPT_AUDIO_VIDEO_TRANSCRIPTION v3 (OPT_V1_DIARIZATION_SURGICAL)'"
    )
    cur.execute(
        "ALTER TABLE tb_transcript_blocks ADD COLUMN IF NOT EXISTS pipeline_version VARCHAR(128) "
        "DEFAULT 'v3.2-VAD-SYNC (gemini-3.8-flash)'"
    )


def get_active_prompt_and_pipeline_versions() -> tuple:
    """Return `(prompt_version_label, pipeline_version_label)` from the active prompt template and configured model."""
    try:
        tpl = get_active_transcription_prompt_template()
        code = str(tpl.get("code") or TRANSCRIPTION_PROMPT_CODE)
        ver = int(tpl.get("version") or 3)
        model = str(tpl.get("defaultModel") or GEMINI_MODEL or "gemini-3.8-flash")
        return (
            f"{code} v{ver} (OPT_V1_DIARIZATION_SURGICAL)",
            f"v3.2-VAD-SYNC ({model})",
        )
    except Exception:
        return (
            f"{TRANSCRIPTION_PROMPT_CODE} v3 (OPT_V1_DIARIZATION_SURGICAL)",
            f"v3.2-VAD-SYNC ({GEMINI_MODEL or 'gemini-3.8-flash'})",
        )


def reset_hearing_for_reprocessing(hearing_id: str):
    """
    Reset a hearing's blocks to QUEUED and delete existing segments so the pipeline re-transcribes
    all parts from scratch using the latest active prompt version in tb_prompt_templates.
    """
    if not hearing_id:
        return
    try:
        prompt_ver, pipeline_ver = get_active_prompt_and_pipeline_versions()
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                _ensure_block_lifecycle_columns(cur)
                cur.execute(
                    "DELETE FROM tb_transcript_segments WHERE transcript_id IN (SELECT id FROM tb_transcripts WHERE hearing_id = %s)",
                    (hearing_id,),
                )
                cur.execute(
                    """
                    UPDATE tb_transcript_blocks
                    SET status = 'QUEUED',
                        segment_count = 0,
                        started_at = NULL,
                        completed_at = NULL,
                        prompt_version = %s,
                        pipeline_version = %s,
                        summary = 'Aguardando reprocessamento na fila sequencial (' || start_time_formatted || ' – ' || end_time_formatted || ')...'
                    WHERE hearing_id = %s
                    """,
                    (prompt_ver, pipeline_ver, hearing_id),
                )
                cur.execute(
                    "UPDATE tb_hearings SET status = 'PROCESSING_TRANSCRIPTION', updated_at = CURRENT_TIMESTAMP WHERE id = %s",
                    (hearing_id,),
                )
            conn.commit()
        logger.info(f"Reset hearing {hearing_id} for full reprocessing with {prompt_ver} / {pipeline_ver}.")
    except Exception as e:
        logger.warning(f"Could not reset hearing {hearing_id} for reprocessing: {e}")


def initialize_hearing_parts(hearing_id: str, parts: list):
    """
    Pre-create all N balanced parts in tb_transcript_blocks as soon as a hearing starts processing,
    setting non-completed parts to status='QUEUED' with exact [coreStartMs, coreEndMs] boundaries.
    """
    if not hearing_id or not parts:
        return
    try:
        prompt_ver, pipeline_ver = get_active_prompt_and_pipeline_versions()
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                _ensure_block_lifecycle_columns(cur)
                total_parts = len(parts)
                if total_parts > 1:
                    cur.execute(
                        "DELETE FROM tb_transcript_blocks WHERE hearing_id = %s AND block_index > %s",
                        (hearing_id, total_parts),
                    )
                for p in parts:
                    b_idx = int(p["blockIndex"])
                    st_ms = int(round(float(p["coreStartSeconds"]) * 1000))
                    et_ms = int(round(float(p["coreEndSeconds"]) * 1000))
                    st_fmt = _format_ms(st_ms)
                    et_fmt = _format_ms(et_ms)
                    pad_sec = int(round(float(p.get("paddingSeconds", 0.0))))
                    title = str(p.get("title") or f"Parte {b_idx}/{total_parts} ({st_fmt} – {et_fmt})")
                    summary = f"Aguardando na fila sequencial ({st_fmt} – {et_fmt})."
                    cur.execute(
                        """
                        INSERT INTO tb_transcript_blocks
                        (id, hearing_id, block_index, title, start_time_ms, end_time_ms,
                         start_time_formatted, end_time_formatted, estimated_tokens,
                         segment_count, summary, processing_duration_ms, status,
                         padding_seconds, context_segments_count, prompt_version, pipeline_version)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 256000, 0, %s, 0, 'QUEUED', %s, 0, %s, %s)
                        ON CONFLICT (hearing_id, block_index) DO UPDATE SET
                            start_time_ms = EXCLUDED.start_time_ms,
                            end_time_ms = EXCLUDED.end_time_ms,
                            start_time_formatted = EXCLUDED.start_time_formatted,
                            end_time_formatted = EXCLUDED.end_time_formatted,
                            padding_seconds = EXCLUDED.padding_seconds,
                            prompt_version = COALESCE(NULLIF(tb_transcript_blocks.prompt_version, ''), EXCLUDED.prompt_version),
                            pipeline_version = COALESCE(NULLIF(tb_transcript_blocks.pipeline_version, ''), EXCLUDED.pipeline_version),
                            status = CASE
                                WHEN tb_transcript_blocks.status = 'COMPLETED' AND tb_transcript_blocks.segment_count > 0
                                THEN 'COMPLETED'
                                ELSE 'QUEUED'
                            END
                        """,
                        (
                            str(uuid.uuid4()),
                            hearing_id,
                            b_idx,
                            title,
                            st_ms,
                            et_ms,
                            st_fmt,
                            et_fmt,
                            summary,
                            pad_sec,
                            prompt_ver,
                            pipeline_ver,
                        ),
                    )
            conn.commit()
    except Exception as e:
        logger.warning(f"Could not initialize hearing parts for {hearing_id}: {e}")


def mark_part_processing(hearing_id: str, block_index: int, padding_seconds: int = 0, context_segments_count: int = 0):
    """Mark a specific part as PROCESSING with started_at = CURRENT_TIMESTAMP and continuity + version metadata."""
    try:
        prompt_ver, pipeline_ver = get_active_prompt_and_pipeline_versions()
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                _ensure_block_lifecycle_columns(cur)
                cur.execute(
                    """
                    UPDATE tb_transcript_blocks
                    SET status = 'PROCESSING',
                        started_at = CURRENT_TIMESTAMP,
                        padding_seconds = %s,
                        context_segments_count = %s,
                        prompt_version = %s,
                        pipeline_version = %s,
                        summary = %s
                    WHERE hearing_id = %s AND block_index = %s
                    """,
                    (
                        int(padding_seconds),
                        int(context_segments_count),
                        prompt_ver,
                        pipeline_ver,
                        f"Transcrevendo agora no Vertex AI ({pipeline_ver} | {prompt_ver})...",
                        hearing_id,
                        int(block_index),
                    ),
                )
            conn.commit()
    except Exception as e:
        logger.warning(f"Could not mark part {block_index} PROCESSING for {hearing_id}: {e}")


def mark_part_retrying_429(
    hearing_id: str,
    block_index: int,
    attempt: int,
    max_attempts: int,
    wait_sec: float,
    model_used: str = "gemini-3.8-flash",
):
    """Update tb_transcript_blocks summary with live anti-429 exponential backoff + jitter telemetry."""
    if not hearing_id:
        return
    try:
        pipeline_ver = f"v3.2-VAD-SYNC ({model_used})"
        retry_summary = (
            f"Retentativa anti-429 ({int(attempt)}/{int(max_attempts)}): aguardando {wait_sec:.0f}s "
            f"de backoff exponencial com jitter no Vertex AI ({model_used})..."
        )
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                _ensure_block_lifecycle_columns(cur)
                cur.execute(
                    """
                    UPDATE tb_transcript_blocks
                    SET status = 'PROCESSING',
                        pipeline_version = %s,
                        summary = %s
                    WHERE hearing_id = %s AND block_index = %s
                    """,
                    (pipeline_ver, retry_summary, hearing_id, int(block_index)),
                )
            conn.commit()
    except Exception as e:
        logger.warning(f"Could not mark part {block_index} retrying 429 for {hearing_id}: {e}")


def mark_part_failed(hearing_id: str, block_index: int, error_msg: str = ""):
    """Mark a specific part as FAILED if Vertex AI transcription fails for that part."""
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                _ensure_block_lifecycle_columns(cur)
                cur.execute(
                    """
                    UPDATE tb_transcript_blocks
                    SET status = 'FAILED',
                        summary = %s
                    WHERE hearing_id = %s AND block_index = %s
                    """,
                    (f"Falha no processamento desta parte: {str(error_msg)[:180]}", hearing_id, int(block_index)),
                )
            conn.commit()
    except Exception as e:
        logger.warning(f"Could not mark part {block_index} FAILED for {hearing_id}: {e}")


def get_existing_progress(hearing_id: str) -> dict:
    """Load already-completed blocks, segments, and participants for a hearing to resume sequential block processing."""
    result = {"blocks": [], "segments": [], "participants": []}
    if not hearing_id:
        return result
    try:
        prompt_ver, pipeline_ver = get_active_prompt_and_pipeline_versions()
        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                _ensure_block_lifecycle_columns(cur)
                cur.execute(
                    """
                    SELECT block_index, title, start_time_ms, end_time_ms, start_time_formatted, end_time_formatted,
                           estimated_tokens, segment_count, summary,
                           COALESCE(processing_duration_ms, 0) AS processing_duration_ms,
                           COALESCE(padding_seconds, 0) AS padding_seconds,
                           COALESCE(context_segments_count, 0) AS context_segments_count,
                           started_at, COALESCE(completed_at, created_at) AS completed_at,
                           COALESCE(prompt_version, %s) AS prompt_version,
                           COALESCE(pipeline_version, %s) AS pipeline_version
                    FROM tb_transcript_blocks
                    WHERE hearing_id = %s
                      AND COALESCE(status, 'COMPLETED') = 'COMPLETED'
                      AND segment_count > 0
                    ORDER BY block_index ASC
                    """,
                    (prompt_ver, pipeline_ver, hearing_id),
                )
                for row in cur.fetchall() or []:
                    result["blocks"].append({
                        "blockIndex": int(row["block_index"]),
                        "title": row["title"],
                        "startTimeMs": int(row["start_time_ms"]),
                        "endTimeMs": int(row["end_time_ms"]),
                        "startTimeFormatted": row["start_time_formatted"],
                        "endTimeFormatted": row["end_time_formatted"],
                        "estimatedTokens": int(row["estimated_tokens"]),
                        "segmentCount": int(row["segment_count"]),
                        "summary": row["summary"],
                        "processingDurationMs": int(row["processing_duration_ms"]),
                        "paddingSeconds": int(row["padding_seconds"]),
                        "contextSegmentsCount": int(row["context_segments_count"]),
                        "startedAt": row["started_at"].isoformat() if row.get("started_at") else None,
                        "completedAt": row["completed_at"].isoformat() if row.get("completed_at") else None,
                        "promptVersion": row.get("prompt_version") or prompt_ver,
                        "pipelineVersion": row.get("pipeline_version") or pipeline_ver,
                        "status": "COMPLETED",
                    })

                cur.execute(
                    """
                    SELECT s.segment_index, s.block_index, s.start_time_ms, s.end_time_ms,
                           s.speaker_role, s.speaker_name, s.text, s.confidence_score,
                           s.is_key_statement, s.topic_tag
                    FROM tb_transcript_segments s
                    JOIN tb_transcripts t ON s.transcript_id = t.id
                    WHERE t.hearing_id = %s
                    ORDER BY s.segment_index ASC
                    """,
                    (hearing_id,),
                )
                for row in cur.fetchall() or []:
                    result["segments"].append({
                        "segmentIndex": int(row["segment_index"]),
                        "blockIndex": int(row["block_index"] or 1),
                        "startTimeMs": int(row["start_time_ms"]),
                        "endTimeMs": int(row["end_time_ms"]),
                        "speakerRole": row["speaker_role"],
                        "speakerName": row["speaker_name"],
                        "text": row["text"],
                        "confidence": float(row["confidence_score"] or 0.98),
                        "isKeyStatement": bool(row["is_key_statement"]),
                        "topicTag": row["topic_tag"] or "Audiência",
                    })

                cur.execute(
                    "SELECT name, role FROM tb_participants WHERE hearing_id = %s",
                    (hearing_id,),
                )
                for row in cur.fetchall() or []:
                    result["participants"].append({
                        "name": row["name"],
                        "role": row["role"],
                    })
    except Exception as e:
        logger.warning(f"Could not load existing progress for hearing {hearing_id}: {e}")
    return result

def _distribute_segments_proportionally(
    b_segs: list,
    b_start_ms: int,
    b_end_ms: int,
    speech_intervals: list = None,
) -> list:
    """
    Distribute a list of segments by spoken Portuguese syllable + alphanumeric weight across
    `[b_start_ms, b_end_ms]` and onto active acoustic `speech_intervals`, using Viterbi Dynamic
    Programming when `len(islands) >= len(b_segs)` so every segment boundary aligns with a real
    inter-island pause, and guaranteeing strictly increasing `startTimeMs < endTimeMs <= next.startTimeMs`.
    """
    import math
    n = len(b_segs)
    if n == 0:
        return []
    b_start_ms = max(0, int(b_start_ms))
    b_end_ms = max(b_start_ms + n * 450, int(b_end_ms))
    span_ms = b_end_ms - b_start_ms
    min_step = min(450, max(120, span_ms // max(1, n + 1)))

    weights = []
    for s in b_segs:
        txt = str(s.get("text") or "").lower().strip()
        alnum = len(re.sub(r"[\W_]+", "", txt))
        syllables = len(re.findall(r"[aeiouáéíóúàâêôãõü]+", txt))
        words = len(txt.split())
        punct_pauses = len(re.findall(r"[.,;?!:]", txt))
        weights.append(max(4.0, syllables * 1.45 + alnum * 0.45 + words * 0.35 + punct_pauses * 1.2))
    total_w = float(sum(weights) or n)

    islands = []
    if speech_intervals:
        for sp_s, sp_e in sorted(speech_intervals):
            s_c = max(b_start_ms, int(sp_s))
            e_c = min(b_end_ms, int(sp_e))
            if e_c - s_c >= 160:
                if islands and s_c - islands[-1][1] < 80:
                    islands[-1] = (islands[-1][0], max(islands[-1][1], e_c))
                else:
                    islands.append((s_c, e_c))

    total_vocal_ms = sum(e - s for s, e in islands)
    if total_vocal_ms < max(n * min_step, int(span_ms * 0.18)):
        islands = [(b_start_ms, b_end_ms)]
        total_vocal_ms = span_ms

    # When we have at least N acoustic speech islands, use Viterbi DP to partition the islands among the N segments
    m_isl = len(islands)
    if m_isl >= n and n >= 2:
        isl_v_cum = [0.0] * (m_isl + 1)
        for idx_i, (s_c, e_c) in enumerate(islands):
            isl_v_cum[idx_i + 1] = isl_v_cum[idx_i] + float(e_c - s_c)
        total_major_sil = sum(
            (islands[idx_i + 1][0] - islands[idx_i][1])
            for idx_i in range(m_isl - 1)
            if (islands[idx_i + 1][0] - islands[idx_i][1]) >= 1200
        )
        total_utt_span = max(float(total_vocal_ms), float((islands[-1][1] - islands[0][0]) - total_major_sil))
        INF = 1e18
        dp = [[INF] * (m_isl + 1) for _ in range(n + 1)]
        parent = [[0] * (m_isl + 1) for _ in range(n + 1)]
        dp[0][0] = 0.0
        max_band = max(18, (m_isl // max(1, n)) * 4 + 8)
        for k in range(1, n + 1):
            w_frac = weights[k - 1] / total_w
            exp_v = max(450.0, total_vocal_ms * w_frac)
            exp_span = max(550.0, total_utt_span * w_frac)
            for j in range(k, m_isl - (n - k) + 1):
                gap_bonus = 0.0
                if j < m_isl:
                    gap_ms = islands[j][0] - islands[j - 1][1]
                    if gap_ms >= 220:
                        gap_bonus = -0.22 * min(1.6, math.log1p(max(0.0, gap_ms - 180.0) / 140.0))
                i_start = max(k - 1, j - max_band)
                for i in range(i_start, j):
                    if dp[k - 1][i] >= INF:
                        continue
                    st_c = islands[i][0]
                    et_c = islands[j - 1][1]
                    act_v = max(100.0, isl_v_cum[j] - isl_v_cum[i])
                    sp_c = float(et_c - st_c)
                    rel_v = abs(act_v - exp_v) / max(500.0, exp_v)
                    rel_sp = abs(sp_c - exp_span) / max(600.0, exp_span)
                    int_sil = max(0.0, sp_c - act_v)
                    sil_pen = 0.40 * (int_sil / max(900.0, exp_span))
                    cost = dp[k - 1][i] + 0.85 * (rel_v ** 1.8) + 1.55 * (rel_sp ** 2.0) + sil_pen + gap_bonus
                    if cost < dp[k][j]:
                        dp[k][j] = cost
                        parent[k][j] = i
        if dp[n][m_isl] < INF:
            out = [None] * n
            cur_j = m_isl
            for k in range(n, 0, -1):
                prev_i = parent[k][cur_j]
                s_copy = dict(b_segs[k - 1])
                s_copy["startTimeMs"] = int(islands[prev_i][0])
                s_copy["endTimeMs"] = max(int(islands[prev_i][0]) + min_step, int(islands[cur_j - 1][1]))
                out[k - 1] = s_copy
                cur_j = prev_i
            return out

    def _vocal_to_abs(v_ms: float) -> int:
        v_clamped = max(0.0, min(float(total_vocal_ms), v_ms))
        acc = 0.0
        for s_c, e_c in islands:
            seg_len = float(e_c - s_c)
            if acc + seg_len >= v_clamped - 1e-6:
                return int(round(s_c + max(0.0, min(seg_len, v_clamped - acc))))
            acc += seg_len
        return islands[-1][1]

    out = []
    cum_w = 0.0
    for i, s in enumerate(b_segs):
        w = weights[i]
        v0 = total_vocal_ms * (cum_w / total_w)
        cum_w += w
        v1 = total_vocal_ms * (cum_w / total_w)
        st_raw = _vocal_to_abs(v0)
        et_raw = _vocal_to_abs(v1)

        # If segment crosses a silence gap between islands, snap cleanly to the dominant island edge
        for idx_isl in range(len(islands) - 1):
            sil_s = islands[idx_isl][1]
            sil_e = islands[idx_isl + 1][0]
            if st_raw < sil_s and et_raw > sil_e:
                if sil_s - st_raw < 380 and et_raw - sil_e >= min_step:
                    st_raw = sil_e
                elif et_raw - sil_e < 380 and sil_s - st_raw >= min_step:
                    et_raw = sil_s

        s_copy = dict(s)
        s_copy["startTimeMs"] = st_raw
        s_copy["endTimeMs"] = et_raw
        out.append(s_copy)

    # Enforce strict non-overlapping monotonicity across all N segments
    for i in range(n):
        prev_end = b_start_ms if i == 0 else out[i - 1]["endTimeMs"]
        rem_after = n - 1 - i
        max_st = b_end_ms - (rem_after + 1) * min_step
        st = max(prev_end, min(max_st, int(out[i]["startTimeMs"])))
        max_et = b_end_ms - rem_after * min_step
        # Leave a natural 80-160ms breath gap before the next segment when segments are back-to-back inside continuous speech
        raw_et = int(out[i]["endTimeMs"])
        if i + 1 < n and raw_et >= int(out[i + 1]["startTimeMs"]) and (raw_et - st) >= min_step + 250:
            raw_et -= 100
        et = max(st + min_step, min(max_et, raw_et))
        out[i]["startTimeMs"] = st
        out[i]["endTimeMs"] = et

    return out


def _repair_and_normalize_block_segments(
    b_segs: list,
    b_start_ms: int,
    b_end_ms: int,
    speech_intervals: list = None,
) -> list:
    """
    Inspect segments of a single block `[b_start_ms, b_end_ms]`:
    - If the block's timestamps are collapsed (e.g., duplicate start/end windows, `0ms` duration segments,
      or segments bunched into the tail of the block), redistribute all segments proportionally across
      `[b_start_ms, b_end_ms]` (and onto `speech_intervals` if provided).
    - If only a local contiguous run of `k >= 2` segments overlaps or shares identical start times,
      redistribute that `k`-segment run proportionally across its window in one pass (never binary halving).
    """
    n = len(b_segs)
    if n == 0:
        return []
    b_start_ms = max(0, int(b_start_ms))
    b_end_ms = max(b_start_ms + n * 450, int(b_end_ms))
    span_ms = b_end_ms - b_start_ms

    starts = [int(s.get("startTimeMs", 0)) for s in b_segs]
    ends = [int(s.get("endTimeMs", 0)) for s in b_segs]
    windows = set(zip(starts, ends))
    distinct_starts = set(starts)
    zero_or_neg = sum(1 for st, et in zip(starts, ends) if et <= st)

    # Check for block-wide timestamp collapse
    is_block_collapsed = False
    if n >= 2:
        if len(windows) <= max(2, int(n * 0.65)) or len(distinct_starts) <= max(2, int(n * 0.65)):
            is_block_collapsed = True
        elif zero_or_neg > 0:
            is_block_collapsed = True
        elif n >= 4 and (min(starts) > b_start_ms + span_ms * 0.60 or (max(ends) - min(starts)) < min(span_ms * 0.20, n * 650)):
            is_block_collapsed = True

    if is_block_collapsed or speech_intervals:
        if is_block_collapsed:
            return _distribute_segments_proportionally(b_segs, b_start_ms, b_end_ms, speech_intervals=speech_intervals)

    # Otherwise, resolve any local overlapping or non-increasing contiguous runs of k >= 2 segments in one pass
    out = [dict(s) for s in b_segs]
    min_cue_ms = min(450, max(120, span_ms // max(1, n + 1)))
    for s in out:
        st = max(b_start_ms, min(b_end_ms - min_cue_ms, int(s.get("startTimeMs", b_start_ms))))
        et = max(st + min_cue_ms, min(b_end_ms, int(s.get("endTimeMs", st + 2500))))
        s["startTimeMs"] = st
        s["endTimeMs"] = et

    # First trim minor single-boundary overlaps where seg[i].startTimeMs >= seg[i-1].startTimeMs + min_cue_ms
    for i in range(1, n):
        if out[i - 1]["endTimeMs"] > out[i]["startTimeMs"] >= out[i - 1]["startTimeMs"] + min_cue_ms:
            out[i - 1]["endTimeMs"] = out[i]["startTimeMs"]

    # Now find any remaining contiguous run [r_start .. r_end] where timestamps are non-increasing or overlapping
    i = 0
    while i < n:
        j = i
        while j + 1 < n and (
            out[j + 1]["startTimeMs"] < out[j]["endTimeMs"]
            or out[j + 1]["startTimeMs"] <= out[j]["startTimeMs"] + min_cue_ms
        ):
            j += 1
        if j > i:
            win_start = out[i]["startTimeMs"]
            if i > 0:
                win_start = max(win_start, out[i - 1]["endTimeMs"])
            win_end = max(s["endTimeMs"] for s in out[i : j + 1])
            if j + 1 < n:
                win_end = max(win_end, min(b_end_ms, out[j + 1]["startTimeMs"]))
            min_needed = (j - i + 1) * min_cue_ms
            if win_end - win_start < min_needed:
                # Expand window backward/forward within block bounds so all k segments fit cleanly
                win_end = min(b_end_ms - (n - 1 - j) * min_cue_ms, max(win_end, win_start + min_needed))
                win_start = max(
                    b_start_ms if i == 0 else out[i - 1]["endTimeMs"],
                    min(win_start, win_end - min_needed),
                )
            redist = _distribute_segments_proportionally(out[i : j + 1], win_start, win_end, speech_intervals=speech_intervals)
            out[i : j + 1] = redist
        i = j + 1

    return out


def save_transcript_and_segments(hearing_id: str, transcript_data: dict) -> str:
    """
    Save the complete transcript and diarized subtitle segments to PostgreSQL,
    enforcing 1-based blockIndex/segmentIndex, preserving exact partition boundaries on blocks,
    and keeping real speech timestamps on segments.
    """
    transcript_id = str(uuid.uuid4())
    language = transcript_data.get("language", "pt-BR")
    avg_confidence = float(transcript_data.get("averageConfidence", 0.98))
    raw_segments = list(transcript_data.get("segments") or [])
    engine_used = transcript_data.get("engineUsed", "GEMINI-3.8-FLASH-PIPELINE")
    data_dur_ms = int(
        transcript_data.get("durationMs")
        or round(float(transcript_data.get("durationSeconds") or 0) * 1000)
    )
    max_seg_end_ms = max((int(s.get("endTimeMs", 0)) for s in raw_segments), default=0)
    max_blk_end_ms = max((int(b.get("endTimeMs", 0)) for b in (transcript_data.get("blocks") or [])), default=0)
    hearing_duration_ms = max(
        5000,
        get_hearing_duration_ms(hearing_id),
        data_dur_ms,
        max_seg_end_ms,
        max_blk_end_ms,
    )

    # Map existing block metadata by 1-based blockIndex, preserving explicit partition bounds [startTimeMs, endTimeMs]
    raw_blocks = list(transcript_data.get("blocks") or [])
    raw_min_blk = min((int(b.get("blockIndex", 1)) for b in raw_blocks), default=1)
    raw_blk_shift = 1 - raw_min_blk if raw_min_blk < 1 else 0
    block_meta_by_idx = {}
    for b in raw_blocks:
        bi = max(1, int(b.get("blockIndex", 1)) + raw_blk_shift)
        block_meta_by_idx[bi] = b

    # Normalize blockIndex to 1-based (if any segment used 0, shift all block indices by +1)
    min_blk = min((int(s.get("blockIndex", 1)) for s in raw_segments), default=1)
    blk_shift = 1 - min_blk if min_blk < 1 else 0

    raw_by_block = {}
    for seg in raw_segments:
        b_idx = max(1, int(seg.get("blockIndex", 1)) + blk_shift)
        raw_by_block.setdefault(b_idx, []).append({
            "blockIndex": b_idx,
            "startTimeMs": int(seg.get("startTimeMs", 0)),
            "endTimeMs": int(seg.get("endTimeMs", 0)),
            "speakerRole": _normalize_speaker_role(seg.get("speakerRole", "OUTRO")),
            "speakerName": str(seg.get("speakerName") or "Interlocutor").strip(),
            "text": str(seg.get("text") or "").strip(),
            "confidence": float(seg.get("confidence", seg.get("confidenceScore", 0.98))),
            "isKeyStatement": bool(seg.get("isKeyStatement", False)),
            "topicTag": str(seg.get("topicTag") or "Audiência").strip(),
        })

    normalized_segments = []
    num_blks = max(len(raw_by_block), len(block_meta_by_idx), 1)
    approx_blk_dur = max(60000, hearing_duration_ms // num_blks)
    for b_idx in sorted(raw_by_block.keys()):
        b_segs = raw_by_block[b_idx]
        meta = block_meta_by_idx.get(b_idx, {})
        b_start_ms = int(meta["startTimeMs"]) if meta.get("startTimeMs") is not None else (b_idx - 1) * approx_blk_dur
        b_end_ms = int(meta["endTimeMs"]) if meta.get("endTimeMs") is not None else min(hearing_duration_ms, b_start_ms + approx_blk_dur)
        repaired_b_segs = _repair_and_normalize_block_segments(
            b_segs,
            b_start_ms,
            b_end_ms,
            speech_intervals=meta.get("speechIntervals"),
        )
        for s in repaired_b_segs:
            s["segmentIndex"] = len(normalized_segments) + 1
            normalized_segments.append(s)

    segments = normalized_segments
    total_segments = len(segments)

    # Extract and deduplicate participants from AI metadata and diarized speaker segments
    raw_participants = list(transcript_data.get("participants") or [])
    participants_by_key = {}

    for p in raw_participants:
        if isinstance(p, dict):
            p_name = str(p.get("name") or "").strip()
            p_role = _normalize_speaker_role(p.get("role", "OUTRO"))
            if p_name:
                key = p_name.lower()
                if key not in participants_by_key or (participants_by_key[key]["role"] == "OUTRO" and p_role != "OUTRO"):
                    participants_by_key[key] = {
                        "id": str(p.get("id") or uuid.uuid4()),
                        "name": p_name,
                        "role": p_role,
                    }

    for seg in segments:
        s_name = str(seg.get("speakerName") or "").strip()
        s_role = _normalize_speaker_role(seg.get("speakerRole", "OUTRO"))
        if s_name:
            key = s_name.lower()
            if key not in participants_by_key or (participants_by_key[key]["role"] == "OUTRO" and s_role != "OUTRO"):
                participants_by_key[key] = {
                    "id": str(uuid.uuid4()),
                    "name": s_name,
                    "role": s_role,
                }

    # Drop generic fallback "interlocutor" if named speakers were identified
    if len(participants_by_key) > 1 and "interlocutor" in participants_by_key:
        del participants_by_key["interlocutor"]

    role_priority = {
        "MAGISTRADO": 0,
        "PROMOTOR": 1,
        "DEFENSOR_PUBLICO": 2,
        "ADVOGADO_AUTOR": 3,
        "ADVOGADO_REU": 4,
        "AUTOR": 5,
        "REU": 6,
        "TESTEMUNHA": 7,
        "PERITO": 8,
        "ESCRIVAO": 9,
        "OUTRO": 10,
    }
    participants_list = sorted(
        participants_by_key.values(),
        key=lambda x: (role_priority.get(x["role"], 10), x["name"]),
    )
    hearing_type = _normalize_hearing_type(transcript_data.get("hearingType"))
    transcript_data["participants"] = participants_list
    transcript_data["hearingType"] = hearing_type

    # Map existing block metadata by 1-based blockIndex, preserving explicit partition bounds [startTimeMs, endTimeMs]
    raw_blocks = list(transcript_data.get("blocks") or [])
    raw_min_blk = min((int(b.get("blockIndex", 1)) for b in raw_blocks), default=1)
    raw_blk_shift = 1 - raw_min_blk if raw_min_blk < 1 else 0
    block_meta_by_idx = {}
    for b in raw_blocks:
        bi = max(1, int(b.get("blockIndex", 1)) + raw_blk_shift)
        block_meta_by_idx[bi] = b

    segments_by_block = {}
    for s in segments:
        segments_by_block.setdefault(s["blockIndex"], []).append(s)

    default_prompt_ver, default_pipeline_ver = get_active_prompt_and_pipeline_versions()
    blocks = []
    for orig_b_idx in sorted(segments_by_block.keys()):
        b_segs = segments_by_block[orig_b_idx]
        meta = block_meta_by_idx.get(orig_b_idx, {})
        b_start_ms = int(meta["startTimeMs"]) if meta.get("startTimeMs") is not None else b_segs[0]["startTimeMs"]
        b_end_ms = int(meta["endTimeMs"]) if meta.get("endTimeMs") is not None else b_segs[-1]["endTimeMs"]
        raw_title = str(meta.get("title") or f"Parte {orig_b_idx}: Transcrição da Audiência").strip()
        blocks.append({
            "blockIndex": orig_b_idx,
            "title": raw_title,
            "startTimeMs": b_start_ms,
            "endTimeMs": b_end_ms,
            "startTimeFormatted": _format_ms(b_start_ms),
            "endTimeFormatted": _format_ms(b_end_ms),
            "estimatedTokens": int(meta.get("estimatedTokens", 256000)),
            "segmentCount": len(b_segs),
            "summary": str(meta.get("summary") or f"Parte {orig_b_idx} da transcrição diarizada ({_format_ms(b_start_ms)} - {_format_ms(b_end_ms)})."),
            "processingDurationMs": int(meta.get("processingDurationMs", 0)),
            "paddingSeconds": int(meta.get("paddingSeconds", 0)),
            "contextSegmentsCount": int(meta.get("contextSegmentsCount", 0)),
            "promptVersion": str(meta.get("promptVersion") or default_prompt_ver),
            "pipelineVersion": str(meta.get("pipelineVersion") or default_pipeline_ver),
        })

    with get_db_connection() as conn:
        with conn.cursor() as cur:
            _ensure_block_lifecycle_columns(cur)
            # 1. Upsert into tb_transcripts
            cur.execute(
                """
                INSERT INTO tb_transcripts (id, hearing_id, detected_language, total_segments, average_confidence, engine_used)
                VALUES (%s, %s, %s, %s, %s, %s)
                ON CONFLICT (hearing_id) DO UPDATE SET
                    detected_language = EXCLUDED.detected_language,
                    total_segments = EXCLUDED.total_segments,
                    average_confidence = EXCLUDED.average_confidence,
                    engine_used = EXCLUDED.engine_used,
                    updated_at = CURRENT_TIMESTAMP
                RETURNING id
                """,
                (transcript_id, hearing_id, language, total_segments, avg_confidence, engine_used),
            )
            row = cur.fetchone()
            if row:
                transcript_id = str(row[0])

            # 2. Upsert completed blocks into tb_transcript_blocks (without deleting QUEUED/PROCESSING blocks)
            block_id_map = {}
            for blk in blocks:
                blk_id = str(uuid.uuid4())
                b_idx = int(blk["blockIndex"])
                block_id_map[b_idx] = blk_id
                proc_dur_ms = max(5000, int(blk.get("processingDurationMs") or 34000))
                cur.execute(
                    """
                    INSERT INTO tb_transcript_blocks
                    (id, hearing_id, block_index, title, start_time_ms, end_time_ms,
                     start_time_formatted, end_time_formatted, estimated_tokens, segment_count,
                     summary, processing_duration_ms, status,
                     started_at, completed_at, padding_seconds, context_segments_count,
                     prompt_version, pipeline_version)
                    VALUES (
                        %s, %s, %s, %s, %s, %s,
                        %s, %s, %s, %s,
                        %s, %s, 'COMPLETED',
                        CURRENT_TIMESTAMP - (%s * interval '1 millisecond'), CURRENT_TIMESTAMP, %s, %s,
                        %s, %s
                    )
                    ON CONFLICT (hearing_id, block_index) DO UPDATE SET
                        title = EXCLUDED.title,
                        start_time_ms = EXCLUDED.start_time_ms,
                        end_time_ms = EXCLUDED.end_time_ms,
                        start_time_formatted = EXCLUDED.start_time_formatted,
                        end_time_formatted = EXCLUDED.end_time_formatted,
                        estimated_tokens = EXCLUDED.estimated_tokens,
                        segment_count = EXCLUDED.segment_count,
                        summary = EXCLUDED.summary,
                        status = 'COMPLETED',
                        completed_at = COALESCE(tb_transcript_blocks.completed_at, CURRENT_TIMESTAMP),
                        started_at = COALESCE(
                            tb_transcript_blocks.started_at,
                            COALESCE(tb_transcript_blocks.completed_at, CURRENT_TIMESTAMP) - (
                                GREATEST(
                                    CASE WHEN EXCLUDED.processing_duration_ms > 0 THEN EXCLUDED.processing_duration_ms ELSE COALESCE(tb_transcript_blocks.processing_duration_ms, 34000) END,
                                    5000
                                ) * interval '1 millisecond'
                            )
                        ),
                        padding_seconds = CASE
                            WHEN EXCLUDED.padding_seconds > 0 THEN EXCLUDED.padding_seconds
                            ELSE COALESCE(tb_transcript_blocks.padding_seconds, 0)
                        END,
                        context_segments_count = CASE
                            WHEN EXCLUDED.context_segments_count > 0 THEN EXCLUDED.context_segments_count
                            ELSE COALESCE(tb_transcript_blocks.context_segments_count, 0)
                        END,
                        processing_duration_ms = CASE
                            WHEN EXCLUDED.processing_duration_ms > 0 THEN EXCLUDED.processing_duration_ms
                            ELSE COALESCE(tb_transcript_blocks.processing_duration_ms, 0)
                        END,
                        prompt_version = COALESCE(NULLIF(EXCLUDED.prompt_version, ''), tb_transcript_blocks.prompt_version),
                        pipeline_version = COALESCE(NULLIF(EXCLUDED.pipeline_version, ''), tb_transcript_blocks.pipeline_version)
                    RETURNING id
                    """,
                    (
                        blk_id,
                        hearing_id,
                        b_idx,
                        blk["title"],
                        int(blk["startTimeMs"]),
                        int(blk["endTimeMs"]),
                        blk["startTimeFormatted"],
                        blk["endTimeFormatted"],
                        int(blk["estimatedTokens"]),
                        int(blk["segmentCount"]),
                        blk["summary"],
                        int(blk.get("processingDurationMs", 0)),
                        proc_dur_ms,
                        int(blk.get("paddingSeconds", 0)),
                        int(blk.get("contextSegmentsCount", 0)),
                        blk["promptVersion"],
                        blk["pipelineVersion"],
                    ),
                )
                blk_row = cur.fetchone()
                if blk_row:
                    block_id_map[b_idx] = str(blk_row[0])

            # 3. Clear existing segments if re-processing
            cur.execute("DELETE FROM tb_transcript_segments WHERE transcript_id = %s", (transcript_id,))

            # 4. Batch insert segments with block links
            insert_segment_sql = """
                INSERT INTO tb_transcript_segments
                (id, transcript_id, segment_index, start_time_ms, end_time_ms, speaker_role, speaker_name, text, confidence_score, is_key_statement, topic_tag, block_id, block_index)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """
            segment_tuples = []
            for seg in segments:
                b_idx = int(seg["blockIndex"])
                b_id = block_id_map.get(b_idx)
                segment_tuples.append((
                    str(uuid.uuid4()),
                    transcript_id,
                    int(seg["segmentIndex"]),
                    int(seg["startTimeMs"]),
                    int(seg["endTimeMs"]),
                    seg["speakerRole"],
                    seg["speakerName"],
                    seg["text"],
                    float(seg["confidence"]),
                    bool(seg["isKeyStatement"]),
                    seg["topicTag"],
                    b_id,
                    b_idx,
                ))

            if segment_tuples:
                cur.executemany(insert_segment_sql, segment_tuples)

            # 5. Update hearing type and replace participants extracted by the AI pipeline
            cur.execute(
                "UPDATE tb_hearings SET hearing_type = %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s",
                (hearing_type, hearing_id),
            )
            cur.execute("DELETE FROM tb_participants WHERE hearing_id = %s", (hearing_id,))
            for p in participants_list:
                cur.execute(
                    """
                    INSERT INTO tb_participants (id, hearing_id, name, role, is_present)
                    VALUES (%s, %s, %s, %s, TRUE)
                    """,
                    (p["id"], hearing_id, p["name"], p["role"]),
                )

        conn.commit()

    logger.info(
        f"Saved transcript {transcript_id} with {len(segments)} segments, {len(participants_list)} AI-extracted participants, across {len(blocks)} blocks for hearing {hearing_id}"
    )
    return transcript_id

def push_hearing_metadata(hearing_id: str, status: str, participants: list = None, hearing_type: str = None):
    """Push pipeline status and AI-extracted metadata (participants count/names, hearingType) to case-service."""
    case_service_url = os.getenv("CASE_SERVICE_URL", "http://case-service:8081").rstrip("/")
    url = f"{case_service_url}/api/v1/hearings/{hearing_id}/metadata"
    payload = {"status": status}
    if participants is not None:
        payload["participants"] = participants
    if hearing_type:
        payload["hearingType"] = _normalize_hearing_type(hearing_type)
    try:
        resp = requests.put(url, json=payload, timeout=10)
        if resp.status_code < 300:
            logger.info(
                f"Pushed metadata to case-service for hearing {hearing_id}: status={status}, participants={len(participants) if participants is not None else 'unchanged'}"
            )
        else:
            logger.warning(f"case-service metadata push returned HTTP {resp.status_code}: {resp.text[:200]}")
    except Exception as e:
        logger.warning(f"Could not push metadata to case-service ({url}) for hearing {hearing_id}: {e}")
