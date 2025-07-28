#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:3333}"
SESSION_COOKIE="${SESSION_COOKIE:-}"
CSRF_TOKEN="${CSRF_TOKEN:-}"
SIMULATE_CONFLICT="${SIMULATE_CONFLICT:-false}"
DRY_RUN="${DRY_RUN:-false}"
VERBOSE="${VERBOSE:-false}"

print_usage() {
  cat <<'EOF'
Usage: bash scripts/smoke_status_board_poc.sh [options]

Options:
  --base-url <url>      Base URL (default: http://127.0.0.1:3333)
  --session <cookie>    adonis-session cookie value (required)
  --csrf <token>        CSRF token (optional, auto-extract from page)
  --conflict            Send simulate_conflict=true in PATCH payload
  --dry-run             Print resolved requests and exit without sending PATCH
  --verbose             Print extra debug logs
  --help                Show this help

Environment vars supported:
  BASE_URL SESSION_COOKIE CSRF_TOKEN SIMULATE_CONFLICT DRY_RUN VERBOSE

Examples:
  SESSION_COOKIE='<cookie>' bash scripts/smoke_status_board_poc.sh --dry-run
  SESSION_COOKIE='<cookie>' bash scripts/smoke_status_board_poc.sh --conflict
EOF
}

log() {
  if [[ "$VERBOSE" == "true" ]]; then
    printf '[smoke] %s\n' "$1"
  fi
}

require_session() {
  if [[ -z "$SESSION_COOKIE" ]]; then
    echo "SESSION_COOKIE is required" >&2
    exit 1
  fi
}

extract_csrf_token() {
  local html="$1"
  echo "$html" | grep -oE 'meta name="csrf-token" content="[^"]+"' | sed -E 's/.*content="([^"]+)".*/\1/' | head -n 1
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --base-url)
      BASE_URL="$2"
      shift 2
      ;;
    --session)
      SESSION_COOKIE="$2"
      shift 2
      ;;
    --csrf)
      CSRF_TOKEN="$2"
      shift 2
      ;;
    --conflict)
      SIMULATE_CONFLICT="true"
      shift
      ;;
    --dry-run)
      DRY_RUN="true"
      shift
      ;;
    --verbose)
      VERBOSE="true"
      shift
      ;;
    --help)
      print_usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      print_usage
      exit 1
      ;;
  esac
done

if [[ "$DRY_RUN" == "true" && -z "$SESSION_COOKIE" ]]; then
  TOTAL=0
  PATCH_PAYLOAD=$(cat <<EOF
{"total":$TOTAL,"simulate_conflict":$SIMULATE_CONFLICT}
EOF
)

  printf 'Resolved request (dry-run, no session):\n'
  printf '  GET   %s/tasks/status-board\n' "$BASE_URL"
  printf '  PATCH %s/api/tasks/status-board\n' "$BASE_URL"
  printf '  Payload: %s\n' "$PATCH_PAYLOAD"
  printf 'Dry-run only. No network request sent.\n'
  exit 0
fi

require_session

log "GET $BASE_URL/tasks/status-board"
PAGE_RESPONSE=$(curl -sS -w '\n%{http_code}' \
  -H "Cookie: adonis-session=${SESSION_COOKIE}" \
  "$BASE_URL/tasks/status-board")
PAGE_CODE=$(echo "$PAGE_RESPONSE" | tail -n 1)
PAGE_BODY=$(echo "$PAGE_RESPONSE" | sed '$d')

if [[ "$PAGE_CODE" != "200" ]]; then
  echo "GET /tasks/status-board failed with HTTP $PAGE_CODE" >&2
  exit 1
fi

if [[ -z "$CSRF_TOKEN" ]]; then
  CSRF_TOKEN=$(extract_csrf_token "$PAGE_BODY")
fi

if [[ -z "$CSRF_TOKEN" ]]; then
  echo "Unable to resolve CSRF token" >&2
  exit 1
fi

TOTAL=$(echo "$PAGE_BODY" | grep -oE '"total"\s*:\s*[0-9]+' | head -n 1 | sed -E 's/.*:\s*([0-9]+)/\1/')
if [[ -z "$TOTAL" ]]; then
  TOTAL=0
fi

PATCH_PAYLOAD=$(cat <<EOF
{"total":$TOTAL,"simulate_conflict":$SIMULATE_CONFLICT}
EOF
)

printf 'Resolved request:\n'
printf '  GET   %s/tasks/status-board\n' "$BASE_URL"
printf '  PATCH %s/api/tasks/status-board\n' "$BASE_URL"
printf '  Payload: %s\n' "$PATCH_PAYLOAD"

if [[ "$DRY_RUN" == "true" ]]; then
  printf 'Dry-run only. No PATCH sent.\n'
  exit 0
fi

log "PATCH $BASE_URL/api/tasks/status-board"
PATCH_RESPONSE=$(curl -sS -w '\n%{http_code}' \
  -X PATCH \
  -H "Cookie: adonis-session=${SESSION_COOKIE}" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-TOKEN: ${CSRF_TOKEN}" \
  -H "X-Requested-With: XMLHttpRequest" \
  -d "$PATCH_PAYLOAD" \
  "$BASE_URL/api/tasks/status-board")
PATCH_CODE=$(echo "$PATCH_RESPONSE" | tail -n 1)
PATCH_BODY=$(echo "$PATCH_RESPONSE" | sed '$d')

printf 'PATCH status: %s\n' "$PATCH_CODE"
printf 'PATCH body: %s\n' "$PATCH_BODY"

if [[ "$PATCH_CODE" == "409" ]]; then
  printf 'Conflict simulated/received. Expected recovery path: reload items+metadata.\n'
  exit 0
fi

if [[ "$PATCH_CODE" != "200" ]]; then
  echo "PATCH failed with HTTP $PATCH_CODE" >&2
  exit 1
fi

printf 'Smoke flow passed.\n'
