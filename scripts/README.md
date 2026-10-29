# Open Judy — Populate Script (`scripts/populate`)

Populates **Open Judy** 100% via the system's HTTP REST APIs (`API Gateway` `:8080`, `case-service` `:8081`, `transcription-service` `:8083`, and `indexer-service` `:8089`) from a base directory containing two subfolders:
1. **Legal Cases subfolder**: `cases/`, `processos/`, `legal_cases/`, or `autos/`
2. **Audiências subfolder**: `audiencias/`, `hearings/`, or `sessoes/`

## Usage

```bash
# Check current system status via REST APIs (non-destructive)
./scripts/populate --status

# Dry-run population against ./data (or custom <base_folder>)
./scripts/populate [base_folder] --dry-run

# Idempotent upsert of cases, documents, hearings, and search index via REST APIs
./scripts/populate [base_folder] [--api-url http://localhost:8080] [--skip-transcription] [--force-reprocess]

# Clean & re-populate from scratch via REST APIs (DELETE /api/v1/.../all)
./scripts/populate <base_folder> --clean
```

Or via the shell wrapper:

```bash
./scripts/populate.sh [base_folder]
```

---

## Reprocess & Repair Transcriptions (`scripts/reprocess_transcriptions`)

Repairs collapsed/duplicate subtitle timestamps via acoustic VAD (`ffmpeg -af silencedetect`) and/or triggers full LLM reprocessing (`forceReprocess=True`) across all hearings in Open Judy:

```bash
# Repair & VAD-align all timestamps in DB immediately (without resetting completed parts)
./scripts/reprocess_transcriptions --repair-only

# Repair timestamps AND reset/enqueue all hearings for full LLM reprocessing from Part 1
./scripts/reprocess_transcriptions --full-llm

# Target a single hearing by UUID or filename search
./scripts/reprocess_transcriptions --hearing-id 7c2812b0-1aa3-46f0-ad9f-d9175c5bb153
./scripts/reprocess_transcriptions --search "1min" --repair-only
```

### Example Directory Structure

```text
<base_folder>/
├── cases/
│   ├── 0018920-55.2025.8.26.0100.json
│   └── 0021450-11.2025.8.26.0100/
│       ├── case.json
│       ├── peticao_inicial.pdf
│       └── contestacao.txt
└── audiencias/
    ├── audiencia_0018920_instrucao.json
    └── audiencia_0021450_conciliacao.mp4
```
