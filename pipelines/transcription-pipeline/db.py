import uuid
import psycopg2
from psycopg2.extras import RealDictCursor
from config import (
    DB_HOST,
    DB_PORT,
    DB_NAME,
    DB_USER,
    DB_PASSWORD,
    DEFAULT_MAX_RETRIES,
    DEFAULT_RETRY_BACKOFF_SECONDS,
    logger,
)

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
    return normalized if normalized in VALID_PARTICIPANT_ROLES else "OUTRO"

def _format_ms(ms: int) -> str:
    total_sec = max(0, int(ms) // 1000)
    minutes = total_sec // 60
    seconds = total_sec % 60
    return f"{minutes:02d}:{seconds:02d}"

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
                        VALUES (%s, %s, 'Vara Cível Central', 'CIVIL', 'Ação Ordinária', 'Parte Autora', 'Parte Ré', 'Dra. Juíza de Direito')
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

def save_transcript_and_segments(hearing_id: str, transcript_data: dict) -> str:
    """
    Save the complete transcript and diarized speech segments to PostgreSQL.
    """
    transcript_id = str(uuid.uuid4())
    language = transcript_data.get("language", "pt-BR")
    avg_confidence = float(transcript_data.get("averageConfidence", 0.98))
    segments = transcript_data.get("segments", [])
    total_segments = len(segments)
    engine_used = transcript_data.get("engineUsed", "GEMINI-2.0-FLASH-PIPELINE")

    blocks = list(transcript_data.get("blocks") or [])
    if not blocks and segments:
        start_ms = int(segments[0].get("startTimeMs", 0))
        end_ms = int(segments[-1].get("endTimeMs", 0))
        blocks = [
            {
                "blockIndex": 1,
                "title": "Bloco 1: Transcrição da Audiência",
                "startTimeMs": start_ms,
                "endTimeMs": end_ms,
                "startTimeFormatted": _format_ms(start_ms),
                "endTimeFormatted": _format_ms(end_ms),
                "estimatedTokens": 256000,
                "segmentCount": len(segments),
                "summary": "Bloco consolidado da transcrição multimodal da audiência.",
            }
        ]

    with get_db_connection() as conn:
        with conn.cursor() as cur:
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

            # 2. Upsert ~256k token blocks into tb_transcript_blocks
            cur.execute("DELETE FROM tb_transcript_blocks WHERE hearing_id = %s", (hearing_id,))
            block_id_map = {}
            for blk in blocks:
                blk_id = str(uuid.uuid4())
                b_idx = int(blk.get("blockIndex", 1))
                block_id_map[b_idx] = blk_id
                cur.execute(
                    """
                    INSERT INTO tb_transcript_blocks
                    (id, hearing_id, block_index, title, start_time_ms, end_time_ms, start_time_formatted, end_time_formatted, estimated_tokens, segment_count, summary)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (hearing_id, block_index) DO UPDATE SET
                        title = EXCLUDED.title,
                        start_time_ms = EXCLUDED.start_time_ms,
                        end_time_ms = EXCLUDED.end_time_ms,
                        start_time_formatted = EXCLUDED.start_time_formatted,
                        end_time_formatted = EXCLUDED.end_time_formatted,
                        estimated_tokens = EXCLUDED.estimated_tokens,
                        segment_count = EXCLUDED.segment_count,
                        summary = EXCLUDED.summary
                    RETURNING id
                    """,
                    (
                        blk_id,
                        hearing_id,
                        b_idx,
                        blk.get("title", f"Bloco {b_idx}"),
                        int(blk.get("startTimeMs", 0)),
                        int(blk.get("endTimeMs", 0)),
                        blk.get("startTimeFormatted", "00:00"),
                        blk.get("endTimeFormatted", "00:00"),
                        int(blk.get("estimatedTokens", 256000)),
                        int(blk.get("segmentCount", 0)),
                        blk.get("summary", ""),
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
            for idx, seg in enumerate(segments, start=1):
                b_idx = int(seg.get("blockIndex", 1))
                b_id = block_id_map.get(b_idx)
                segment_tuples.append((
                    str(uuid.uuid4()),
                    transcript_id,
                    int(seg.get("segmentIndex", idx)),
                    int(seg.get("startTimeMs", 0)),
                    int(seg.get("endTimeMs", 0)),
                    _normalize_speaker_role(seg.get("speakerRole", "OUTRO")),
                    seg.get("speakerName", "Interlocutor"),
                    seg.get("text", ""),
                    float(seg.get("confidence", 0.95)),
                    bool(seg.get("isKeyStatement", False)),
                    seg.get("topicTag", "Geral"),
                    b_id,
                    b_idx,
                ))

            if segment_tuples:
                cur.executemany(insert_segment_sql, segment_tuples)

        conn.commit()

    logger.info(f"Saved transcript {transcript_id} with {len(segments)} segments across {len(blocks)} (~256k token) blocks for hearing {hearing_id}")
    return transcript_id
