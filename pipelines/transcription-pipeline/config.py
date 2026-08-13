import os
import logging
from typing import Optional

# Setup Logging
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()
logging.basicConfig(
    level=LOG_LEVEL,
    format="%(asctime)s [%(levelname)s] [transcription-pipeline] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("transcription_pipeline")

# RabbitMQ Settings
RABBITMQ_HOST = os.getenv("RABBITMQ_HOST", "localhost")
RABBITMQ_PORT = int(os.getenv("RABBITMQ_PORT", "5672"))
RABBITMQ_USER = os.getenv("RABBITMQ_USER", "judy_user")
RABBITMQ_PASSWORD = os.getenv("RABBITMQ_PASSWORD", "judy_password")
RABBITMQ_VHOST = os.getenv("RABBITMQ_VHOST", "/")

# RabbitMQ Queues and Exchanges
EXCHANGE_NAME = os.getenv("EXCHANGE_NAME", "judy.direct")
QUEUE_NAME = os.getenv("QUEUE_NAME", "judy.transcription.jobs")
ROUTING_KEY = os.getenv("ROUTING_KEY", "transcription.job")
DLQ_EXCHANGE = os.getenv("DLQ_EXCHANGE", "judy.dlx")
DLQ_QUEUE_NAME = os.getenv("DLQ_QUEUE_NAME", "judy.transcription.dlq")
DLQ_ROUTING_KEY = os.getenv("DLQ_ROUTING_KEY", "transcription.dlq")

# Database (AlloyDB / PostgreSQL) Settings
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = int(os.getenv("DB_PORT", "5432"))
DB_NAME = os.getenv("DB_NAME", "open_judy_db")
DB_USER = os.getenv("DB_USER", "judy_user")
DB_PASSWORD = os.getenv("DB_PASSWORD", "judy_password")

# Gemini AI Settings
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "mock_or_set_real_gemini_key")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
GEMINI_API_URL = os.getenv("GEMINI_API_URL", "https://generativelanguage.googleapis.com/v1beta")

# Pipeline Resilience Settings (Defaults, can be dynamically overridden from tb_system_settings)
DEFAULT_MAX_RETRIES = int(os.getenv("MAX_RETRIES", "3"))
DEFAULT_RETRY_BACKOFF_SECONDS = int(os.getenv("RETRY_BACKOFF_SECONDS", "5"))
