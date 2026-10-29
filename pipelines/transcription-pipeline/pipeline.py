import json
import threading
import time
import uuid
import pika
from config import (
    EXCHANGE_NAME,
    ROUTING_KEY,
    COMPLETED_ROUTING_KEY,
    DLQ_EXCHANGE,
    DLQ_ROUTING_KEY,
    logger,
)
from db import (
    get_max_retries,
    get_retry_backoff_seconds,
    update_hearing_status,
    save_transcript_and_segments,
    push_hearing_metadata,
    reset_hearing_for_reprocessing,
)
from gemini_client import GeminiMultimodalClient

_active_hearings_lock = threading.Lock()
_active_hearings: set[str] = set()


class TranscriptionPipeline:
    def __init__(self, worker_id: int = 1):
        self.worker_id = worker_id
        self.gemini_client = GeminiMultimodalClient()

    def process_message(self, channel: pika.adapters.blocking_connection.BlockingChannel, method, properties, body: bytes):
        """
        Process incoming transcription job with sequential 5-10 min part splitting
        per hearing, while multiple hearings execute in parallel across worker threads.
        """
        try:
            payload = json.loads(body.decode("utf-8"))
        except Exception as e:
            logger.error(f"[Worker-{self.worker_id}] Malformed JSON payload, rejecting: {e}")
            channel.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
            return

        hearing_id = payload.get("hearingId") or payload.get("hearing_id")
        case_number = payload.get("caseNumber") or payload.get("case_number", "0000000-00.0000.0.00.0000")
        media_type = payload.get("mediaType") or payload.get("media_type", "VIDEO")
        filename = payload.get("filename") or payload.get("mediaFilename") or payload.get("originalFilename") or "audio.mp4"
        force_reprocess = bool(payload.get("forceReprocess") or payload.get("force_reprocess", False))
        retry_count = int(payload.get("retry_count", 0))

        if not hearing_id:
            logger.error(f"[Worker-{self.worker_id}] Message missing hearingId: {payload}. Discarding.")
            channel.basic_ack(delivery_tag=method.delivery_tag)
            return

        try:
            hearing_id = str(uuid.UUID(str(hearing_id)))
        except ValueError:
            logger.error(f"[Worker-{self.worker_id}] Invalid UUID for hearingId '{hearing_id}' in payload {payload}. Discarding.")
            channel.basic_ack(delivery_tag=method.delivery_tag)
            return

        with _active_hearings_lock:
            if hearing_id in _active_hearings:
                logger.info(
                    f"[Worker-{self.worker_id}] Hearing [{hearing_id}] is already being transcribed "
                    f"by another parallel worker thread. Acknowledging duplicate message."
                )
                channel.basic_ack(delivery_tag=method.delivery_tag)
                return
            _active_hearings.add(hearing_id)
            active_count = len(_active_hearings)

        logger.info(
            f"==> [Worker-{self.worker_id}] (Parallel active hearings: {active_count}) "
            f"Starting sequential block pipeline for Hearing [{hearing_id}] "
            f"Process [{case_number}] File [{filename}] (Attempt {retry_count + 1})"
        )

        max_retries = get_max_retries()
        base_backoff = get_retry_backoff_seconds()

        try:
            # 0. If forceReprocess was requested from UI ("Reprocessar Vídeo"), clear old parts & segments
            if force_reprocess and retry_count == 0:
                logger.info(
                    f"[Worker-{self.worker_id}] forceReprocess=True for Hearing [{hearing_id}]: "
                    f"clearing existing parts and segments to reprocess from Part 1 with active prompt."
                )
                reset_hearing_for_reprocessing(hearing_id)

            # 1. Update hearing status to PROCESSING_TRANSCRIPTION
            update_hearing_status(hearing_id, "PROCESSING_TRANSCRIPTION", case_number)
            push_hearing_metadata(hearing_id, status="PROCESSING_TRANSCRIPTION")

            def _on_part_progress(partial_result: dict, part_idx: int, total_parts: int):
                try:
                    # Keep RabbitMQ heartbeat alive during multi-part sequential transcription
                    if channel and channel.connection and channel.connection.is_open:
                        channel.connection.process_data_events(time_limit=0)
                except Exception:
                    pass
                save_transcript_and_segments(hearing_id, partial_result)
                push_hearing_metadata(
                    hearing_id,
                    status="PROCESSING_TRANSCRIPTION" if part_idx < total_parts else "TRANSCRIPTION_COMPLETED",
                    participants=partial_result.get("participants", []),
                    hearing_type=partial_result.get("hearingType"),
                )
                logger.info(
                    f"[PROGRESS][Worker-{self.worker_id}] Hearing [{hearing_id}] Part {part_idx}/{total_parts} saved "
                    f"({len(partial_result.get('segments', []))} cumulative segments, "
                    f"{len(partial_result.get('participants', []))} participants)"
                )

            # 2. Execute Sequential Chunked Gemini 3.8 Flash Multimodal Diarization & Transcription
            transcript_result = self.gemini_client.transcribe(
                case_number=case_number,
                media_type=media_type,
                filename=filename,
                hearing_id=hearing_id,
                on_part_progress=_on_part_progress,
                force_reprocess=force_reprocess and (retry_count == 0),
            )

            # 3. Persist final complete transcript and speaker segments in Database
            transcript_id = save_transcript_and_segments(hearing_id, transcript_result)

            # 4. Mark hearing as completed and push AI-extracted metadata (participants, hearingType, status)
            update_hearing_status(hearing_id, "TRANSCRIPTION_COMPLETED", case_number)
            push_hearing_metadata(
                hearing_id,
                status="TRANSCRIPTION_COMPLETED",
                participants=transcript_result.get("participants", []),
                hearing_type=transcript_result.get("hearingType"),
            )

            # 5. Emit TranscriptionCompleted event to RabbitMQ
            completed_payload = {
                "hearingId": str(hearing_id),
                "caseNumber": str(case_number),
                "transcriptId": str(transcript_id),
                "totalSegments": len(transcript_result.get("segments", [])),
                "detectedLanguage": transcript_result.get("language", "pt-BR"),
                "durationSeconds": payload.get("durationSeconds", 120.0),
                "averageConfidence": transcript_result.get("averageConfidence", 0.98),
                "timestamp": time.time(),
            }
            try:
                if channel and channel.connection and channel.connection.is_open:
                    channel.connection.process_data_events(time_limit=0)
                channel.basic_publish(
                    exchange=EXCHANGE_NAME,
                    routing_key=COMPLETED_ROUTING_KEY,
                    body=json.dumps(completed_payload),
                    properties=pika.BasicProperties(delivery_mode=2),
                )
                channel.basic_publish(
                    exchange=EXCHANGE_NAME,
                    routing_key="task.event",
                    body=json.dumps({
                        "id": f"task-trans-{hearing_id}",
                        "taskType": "TRANSCRIPTION",
                        "entityType": "HEARING",
                        "entityId": str(hearing_id),
                        "entityTitle": f"{filename} ({case_number})",
                        "queueName": "judy.transcription.jobs",
                        "routingKey": "transcription.job",
                        "status": "COMPLETED",
                        "progressPct": 100,
                        "promptVersion": "PROMPT_AUDIO_VIDEO_TRANSCRIPTION v3 (OPT_V1_DIARIZATION_SURGICAL)",
                        "pipelineVersion": "v3.2-VAD-SYNC (gemini-3.8-flash)",
                        "workerId": f"open-judy-transcription-pipeline-{self.worker_id}",
                        "resultSummary": f"{len(transcript_result.get('blocks', []))} partes concluídas • {len(transcript_result.get('segments', []))} segmentos diarizados com alinhamento acústico VAD",
                    }),
                    properties=pika.BasicProperties(delivery_mode=2),
                )
                channel.basic_publish(
                    exchange=EXCHANGE_NAME,
                    routing_key="audit.event",
                    body=json.dumps({
                        "id": f"audit-trans-{hearing_id}",
                        "actorEmail": "admin@openjudy.org",
                        "actorName": "Pipeline Multimodal RabbitMQ",
                        "actorRole": "ADMIN",
                        "action": "TRANSCRIPTION_COMPLETED",
                        "category": "TASK",
                        "entityType": "HEARING",
                        "entityId": str(hearing_id),
                        "entityName": f"{filename} ({case_number})",
                        "status": "SUCCESS",
                        "rabbitmqQueue": "judy.transcription.completed",
                        "detailsJson": completed_payload,
                    }),
                    properties=pika.BasicProperties(delivery_mode=2),
                )
            except Exception as pub_err:
                logger.warning(f"[Worker-{self.worker_id}] Could not publish completion event to RabbitMQ: {pub_err}")

            # 5b. Trigger asynchronous AI Legal Analysis & Contradiction Detection task via system API
            def _trigger_analysis_task(hid: str):
                import os
                import urllib.request
                base_url = os.getenv("CASE_SERVICE_URL", "http://case-service:8081")
                for url in (
                    f"{base_url}/api/v1/hearings/{hid}/analyze",
                    f"http://transcription-service:8083/api/v1/ai/hearings/{hid}/analyze",
                ):
                    try:
                        req = urllib.request.Request(url, data=b"{}", headers={"Content-Type": "application/json"}, method="POST")
                        with urllib.request.urlopen(req, timeout=10) as resp:
                            if 200 <= resp.status < 300:
                                logger.info(f"[Worker-{self.worker_id}] Triggered AI analysis & contradiction task for Hearing [{hid}] via {url}")
                                break
                    except Exception:
                        continue

            threading.Thread(target=_trigger_analysis_task, args=(str(hearing_id),), daemon=True).start()

            logger.info(
                f"[SUCCESS][Worker-{self.worker_id}] Hearing [{hearing_id}] successfully transcribed across "
                f"{len(transcript_result.get('blocks', []))} part(s) "
                f"({len(transcript_result.get('segments', []))} total segments, ID: {transcript_id})"
            )
            channel.basic_ack(delivery_tag=method.delivery_tag)

        except Exception as err:
            logger.error(f"[FAILURE][Worker-{self.worker_id}] Error processing hearing [{hearing_id}]: {err}", exc_info=True)

            if retry_count < max_retries:
                next_retry = retry_count + 1
                delay = base_backoff * (2 ** retry_count)
                logger.warning(f"[Worker-{self.worker_id}] Scheduling retry {next_retry}/{max_retries} for Hearing [{hearing_id}] in {delay}s...")

                payload["retry_count"] = next_retry
                payload["last_error"] = str(err)
                payload["last_attempt_timestamp"] = time.time()

                time.sleep(delay)

                channel.basic_publish(
                    exchange=EXCHANGE_NAME,
                    routing_key=ROUTING_KEY,
                    body=json.dumps(payload),
                    properties=pika.BasicProperties(
                        delivery_mode=2,
                        headers={"x-retry-count": next_retry},
                    ),
                )
                channel.basic_ack(delivery_tag=method.delivery_tag)
            else:
                logger.critical(f"[DLQ][Worker-{self.worker_id}] Max retries ({max_retries}) exceeded for Hearing [{hearing_id}]. Moving to DLQ.")
                try:
                    update_hearing_status(hearing_id, "FAILED", case_number)
                    push_hearing_metadata(hearing_id, status="FAILED")
                except Exception as db_err:
                    logger.error(f"Could not update hearing status to FAILED for [{hearing_id}]: {db_err}")

                payload["failed_at"] = time.time()
                payload["final_error"] = str(err)

                channel.basic_publish(
                    exchange=DLQ_EXCHANGE,
                    routing_key=DLQ_ROUTING_KEY,
                    body=json.dumps(payload),
                    properties=pika.BasicProperties(
                        delivery_mode=2,
                        headers={"x-exception-message": str(err)},
                    ),
                )
                channel.basic_ack(delivery_tag=method.delivery_tag)
        finally:
            with _active_hearings_lock:
                _active_hearings.discard(hearing_id)
