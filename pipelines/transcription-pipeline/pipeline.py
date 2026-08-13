import json
import time
import pika
from config import (
    EXCHANGE_NAME,
    ROUTING_KEY,
    DLQ_EXCHANGE,
    DLQ_ROUTING_KEY,
    logger,
)
from db import (
    get_max_retries,
    get_retry_backoff_seconds,
    update_hearing_status,
    save_transcript_and_segments,
)
from gemini_client import GeminiMultimodalClient

class TranscriptionPipeline:
    def __init__(self):
        self.gemini_client = GeminiMultimodalClient()

    def process_message(self, channel: pika.adapters.blocking_connection.BlockingChannel, method, properties, body: bytes):
        """
        Process incoming transcription job with resilient retry policy and DLQ routing.
        """
        try:
            payload = json.loads(body.decode("utf-8"))
        except Exception as e:
            logger.error(f"Malformed JSON payload, rejecting: {e}")
            channel.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
            return

        hearing_id = payload.get("hearingId") or payload.get("hearing_id")
        case_number = payload.get("caseNumber") or payload.get("case_number", "0000000-00.0000.0.00.0000")
        media_type = payload.get("mediaType") or payload.get("media_type", "VIDEO")
        filename = payload.get("filename") or payload.get("originalFilename") or "audio.mp4"
        retry_count = int(payload.get("retry_count", 0))

        if not hearing_id:
            logger.error(f"Message missing hearingId: {payload}. Discarding.")
            channel.basic_ack(delivery_tag=method.delivery_tag)
            return

        logger.info(f"==> Starting transcription pipeline for Hearing [{hearing_id}] Process [{case_number}] (Attempt {retry_count + 1})")

        # Fetch dynamic resilience config from system settings
        max_retries = get_max_retries()
        base_backoff = get_retry_backoff_seconds()

        try:
            # 1. Update hearing status to PROCESSING_TRANSCRIPTION
            update_hearing_status(hearing_id, "PROCESSING_TRANSCRIPTION", case_number)

            # 2. Execute Gemini Multimodal Diarization & Transcription
            transcript_result = self.gemini_client.transcribe(
                case_number=case_number,
                media_type=media_type,
                filename=filename,
            )

            # 3. Persist transcript and speaker segments in Database
            transcript_id = save_transcript_and_segments(hearing_id, transcript_result)

            # 4. Mark hearing as completed
            update_hearing_status(hearing_id, "TRANSCRIPTION_COMPLETED", case_number)

            # 5. Emit TranscriptionCompleted event to RabbitMQ for notification-service and downstream consumers
            completed_payload = {
                "hearingId": str(hearing_id),
                "caseNumber": str(case_number),
                "transcriptId": str(transcript_id),
                "totalSegments": len(transcript_result.get("segments", [])),
                "detectedLanguage": transcript_result.get("language", "pt-BR"),
                "durationSeconds": payload.get("durationSeconds", 120.0),
                "averageConfidence": transcript_result.get("averageConfidence", 0.98),
                "timestamp": time.time()
            }
            channel.basic_publish(
                exchange=EXCHANGE_NAME,
                routing_key="transcription.completed",
                body=json.dumps(completed_payload),
                properties=pika.BasicProperties(delivery_mode=2)
            )

            logger.info(f"[SUCCESS] Hearing [{hearing_id}] successfully transcribed (ID: {transcript_id}) and completion event emitted")
            channel.basic_ack(delivery_tag=method.delivery_tag)

        except Exception as err:
            logger.error(f"[FAILURE] Error processing hearing [{hearing_id}]: {err}", exc_info=True)

            if retry_count < max_retries:
                next_retry = retry_count + 1
                delay = base_backoff * (2 ** retry_count)  # Exponential backoff
                logger.warning(f"Scheduling retry {next_retry}/{max_retries} for Hearing [{hearing_id}] in {delay}s...")

                payload["retry_count"] = next_retry
                payload["last_error"] = str(err)
                payload["last_attempt_timestamp"] = time.time()

                # Sleep backoff before re-publishing or requeue
                time.sleep(delay)

                channel.basic_publish(
                    exchange=EXCHANGE_NAME,
                    routing_key=ROUTING_KEY,
                    body=json.dumps(payload),
                    properties=pika.BasicProperties(
                        delivery_mode=2,  # Persistent message
                        headers={"x-retry-count": next_retry},
                    ),
                )
                # Acknowledge original message to remove it from head of queue
                channel.basic_ack(delivery_tag=method.delivery_tag)
            else:
                logger.critical(f"[DLQ] Max retries ({max_retries}) exceeded for Hearing [{hearing_id}]. Moving to DLQ.")
                update_hearing_status(hearing_id, "FAILED")

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
