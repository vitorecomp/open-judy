import sys
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
    DLQ_EXCHANGE,
    DLQ_QUEUE_NAME,
    DLQ_ROUTING_KEY,
    logger,
)
from pipeline import TranscriptionPipeline

pipeline = TranscriptionPipeline()
should_run = True

def handle_signal(sig, frame):
    global should_run
    logger.info(f"Received signal {sig}. Initiating graceful shutdown...")
    should_run = False

signal.signal(signal.SIGINT, handle_signal)
signal.signal(signal.SIGTERM, handle_signal)

def connect_and_consume():
    credentials = pika.PlainCredentials(RABBITMQ_USER, RABBITMQ_PASSWORD)
    parameters = pika.ConnectionParameters(
        host=RABBITMQ_HOST,
        port=RABBITMQ_PORT,
        virtual_host=RABBITMQ_VHOST,
        credentials=credentials,
        heartbeat=60,
        blocked_connection_timeout=300,
    )

    logger.info(f"Connecting to RabbitMQ at {RABBITMQ_HOST}:{RABBITMQ_PORT} (vhost: {RABBITMQ_VHOST})...")
    connection = pika.BlockingConnection(parameters)
    channel = connection.channel()

    # 1. Setup Dead Letter Exchange and DLQ
    channel.exchange_declare(exchange=DLQ_EXCHANGE, exchange_type="direct", durable=True)
    channel.queue_declare(queue=DLQ_QUEUE_NAME, durable=True)
    channel.queue_bind(exchange=DLQ_EXCHANGE, queue=DLQ_QUEUE_NAME, routing_key=DLQ_ROUTING_KEY)

    # 2. Setup Main Exchange and Queue
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

    # 3. Configure Fair Dispatching (Prefetch 1)
    channel.basic_qos(prefetch_count=1)

    # 4. Bind consumer
    channel.basic_consume(
        queue=QUEUE_NAME,
        on_message_callback=pipeline.process_message,
        auto_ack=False,
    )

    logger.info(f"[*] Transcription Pipeline is listening for jobs on queue '{QUEUE_NAME}'. Waiting for messages...")

    try:
        while should_run and channel.is_open:
            connection.process_data_events(time_limit=1)
    except pika.exceptions.ConnectionClosedByBroker:
        logger.warning("Connection was closed by broker, reconnecting...")
    except pika.exceptions.AMQPChannelError as err:
        logger.error(f"Caught channel error: {err}, stopping...")
    except (KeyboardInterrupt, SystemExit):
        logger.info("Pipeline worker stopped.")
    finally:
        if connection.is_open:
            connection.close()

def main():
    logger.info("Starting Open Judy Transcription Pipeline Worker (Python)...")
    while should_run:
        try:
            connect_and_consume()
        except pika.exceptions.AMQPConnectionError as e:
            logger.warning(f"RabbitMQ connection failed ({e}). Retrying in 5 seconds...")
            time.sleep(5)
        except Exception as e:
            logger.error(f"Unexpected error in pipeline loop: {e}", exc_info=True)
            time.sleep(5)

if __name__ == "__main__":
    main()
