# Open Judy — Populate Script (`scripts/populate`)

Populates **Open Judy** (`case-service`, `transcription-service`, `AlloyDB`, and `indexer-service`) from a base directory containing two subfolders:
1. **Legal Cases subfolder**: `cases/`, `processos/`, `legal_cases/`, or `autos/`
2. **Audiências subfolder**: `audiencias/`, `hearings/`, or `sessoes/`

## Usage

```bash
./scripts/populate <base_folder> [--enqueue-transcription]
```

Or via the shell wrapper:

```bash
./scripts/populate.sh <base_folder>
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
