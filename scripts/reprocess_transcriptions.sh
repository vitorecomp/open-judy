#!/usr/bin/env bash
# Open Judy — Shell wrapper & direct curl client for System Transcription Reprocessing Endpoints
# Calls GET /api/v1/hearings and POST /api/v1/hearings/{id}/reprocess?forceReprocess=true|false
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ "${1:-}" == "--curl" ]]; then
  shift
  API_URL="${OPEN_JUDY_API_URL:-http://localhost:8080}"
  FORCE="${1:-true}"
  if ! curl -sf "${API_URL}/api/v1/hearings" >/dev/null 2>&1; then
    if curl -sf "http://localhost:3000/api/v1/hearings" >/dev/null 2>&1; then
      API_URL="http://localhost:3000"
    else
      API_URL="http://localhost:8081"
    fi
  fi
  echo "[GET ${API_URL}/api/v1/hearings] Fetching hearings..."
  HEARING_IDS=$(curl -sf "${API_URL}/api/v1/hearings" | python3 -c "import sys, json; print(' '.join(str(h['id']) for h in json.load(sys.stdin)))")
  for HID in $HEARING_IDS; do
    echo "[POST ${API_URL}/api/v1/hearings/${HID}/reprocess?forceReprocess=${FORCE}]"
    curl -sf -X POST "${API_URL}/api/v1/hearings/${HID}/reprocess?forceReprocess=${FORCE}" \
      -H "Content-Type: application/json" \
      -d "{\"hearingId\":\"${HID}\",\"forceReprocess\":${FORCE}}" || \
    curl -sf -X POST "http://localhost:8083/api/v1/transcriptions/hearing/${HID}/reprocess?forceReprocess=${FORCE}" \
      -H "Content-Type: application/json" \
      -d "{\"hearingId\":\"${HID}\",\"forceReprocess\":${FORCE}}"
    echo ""
  done
  exit 0
fi

exec "$SCRIPT_DIR/reprocess_transcriptions" "$@"
