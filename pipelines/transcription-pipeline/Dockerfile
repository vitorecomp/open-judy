FROM docker.io/python:3.11-slim

WORKDIR /app

# Install build dependencies for psycopg2
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY pipelines/transcription-pipeline/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy pipeline source code
COPY pipelines/transcription-pipeline/ .

ENV PYTHONUNBUFFERED=1

CMD ["python", "main.py"]
