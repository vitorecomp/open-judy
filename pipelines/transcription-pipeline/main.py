import os
import sys
import threading
import time
import signal
import pika
from config import (
    RABBITMQ_HOST,
    RABBITMQ_PORT,
    RABBITMQ_USER,
    RABBITMQ_PASSWORD,
    RABBITMQ_VHOST,
    EXCHANGE_NAME,
    QUEUE_NAME,
    ROUTING_KEY,
    COMPLETED_QUEUE_NAME,
    COMPLETED_ROUTING_KEY,
    DLQ_EXCHANGE,
    DLQ_QUEUE_NAME,
    DLQ_ROUTING_KEY,
    logger,
)
from pipeline import TranscriptionPipeline

PARALLEL_HEARING_WORKERS = int(os.getenv("PARALLEL_HEARING_WORKERS", "6"))
should_run = True


def handle_signal(sig, frame):
    global should_run
    logger.info(f"Received signal {sig}. Initiating graceful shutdown...")
    should_run = False


signal.signal(signal.SIGINT, handle_signal)
signal.signal(signal.SIGTERM, handle_signal)


def connect_and_consume(worker_id: int):
    worker_pipeline = TranscriptionPipeline(worker_id=worker_id)
    credentials = pika.PlainCredentials(RABBITMQ_USER, RABBITMQ_PASSWORD)
    parameters = pika.ConnectionParameters(
        host=RABBITMQ_HOST,
        port=RABBITMQ_PORT,
        virtual_host=RABBITMQ_VHOST,
        credentials=credentials,
        heartbeat=1800,
        blocked_connection_timeout=1800,
    )

    logger.info(
        f"[Worker-{worker_id}] Connecting to RabbitMQ at {RABBITMQ_HOST}:{RABBITMQ_PORT} "
        f"(vhost: {RABBITMQ_VHOST})..."
    )
    connection = pika.BlockingConnection(parameters)
    channel = connection.channel()

    # 1. Setup Dead Letter Exchange and DLQ
    channel.exchange_declare(exchange=DLQ_EXCHANGE, exchange_type="direct", durable=True)
    channel.queue_declare(queue=DLQ_QUEUE_NAME, durable=True)
    channel.queue_bind(exchange=DLQ_EXCHANGE, queue=DLQ_QUEUE_NAME, routing_key=DLQ_ROUTING_KEY)

    # 2. Setup Main Exchange, Jobs Queue, and Completed Events Queue
    channel.exchange_declare(exchange=EXCHANGE_NAME, exchange_type="direct", durable=True)
    channel.queue_declare(
        queue=QUEUE_NAME,
        durable=True,
        arguments={
            "x-dead-letter-exchange": DLQ_EXCHANGE,
            "x-dead-letter-routing-key": DLQ_ROUTING_KEY,
        },
    )
    channel.queue_bind(exchange=EXCHANGE_NAME, queue=QUEUE_NAME, routing_key=ROUTING_KEY)

    channel.queue_declare(queue=COMPLETED_QUEUE_NAME, durable=True)
    channel.queue_bind(exchange=EXCHANGE_NAME, queue=COMPLETED_QUEUE_NAME, routing_key=COMPLETED_ROUTING_KEY)

    # 3. Configure Fair Dispatching (Prefetch 1 per worker so each worker runs 1 hearing's sequential blocks)
    channel.basic_qos(prefetch_count=1)

    # 4. Bind consumer
    channel.basic_consume(
        queue=QUEUE_NAME,
        on_message_callback=worker_pipeline.process_message,
        auto_ack=False,
    )

    logger.info(
        f"[*] [Worker-{worker_id}] Listening for hearing jobs on queue '{QUEUE_NAME}' "
        f"(parallel hearings enabled, sequential blocks per hearing)..."
    )

    try:
        while should_run and channel.is_open:
            connection.process_data_events(time_limit=1)
    except pika.exceptions.ConnectionClosedByBroker:
        logger.warning(f"[Worker-{worker_id}] Connection was closed by broker, reconnecting...")
    except pika.exceptions.AMQPChannelError as err:
        logger.error(f"[Worker-{worker_id}] Caught channel error: {err}, stopping...")
    except (KeyboardInterrupt, SystemExit):
        logger.info(f"[Worker-{worker_id}] Pipeline worker stopped.")
    finally:
        if connection.is_open:
            connection.close()


def worker_loop(worker_id: int):
    while should_run:
        try:
            connect_and_consume(worker_id)
        except pika.exceptions.AMQPConnectionError as e:
            logger.warning(f"[Worker-{worker_id}] RabbitMQ connection failed ({e}). Retrying in 5 seconds...")
            time.sleep(5)
        except Exception as e:
            logger.error(f"[Worker-{worker_id}] Unexpected error in pipeline loop: {e}", exc_info=True)
            time.sleep(5)


def main():
    logger.info(
        f"Starting Open Judy Transcription Pipeline Worker Pool "
        f"({PARALLEL_HEARING_WORKERS} parallel hearing workers, sequential blocks per hearing)..."
    )
    threads: list[threading.Thread] = []
    for worker_id in range(1, PARALLEL_HEARING_WORKERS + 1):
        t = threading.Thread(
            target=worker_loop,
            args=(worker_id,),
            name=f"hearing-worker-{worker_id}",
            daemon=True,
        )
        t.start()
        threads.append(t)
        time.sleep(0.2)

    try:
        while should_run:
            time.sleep(1)
    except (KeyboardInterrupt, SystemExit):
        pass
    logger.info("Waiting for parallel worker threads to exit...")


if __name__ == "__main__":
    main()
