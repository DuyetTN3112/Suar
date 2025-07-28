#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

HOTSPOT_MAP_FILE="docs/frontend_refactor/HOTSPOT_OWNER_MAP_2026_04_05.md"
PR_TEMPLATE_FILE=".github/pull_request_template.md"
FAIL_MODE="${HOTSPOT_OWNER_GATE_FAIL:-0}"

has_error=0

printf "[owner-gate] Running hotspot ownership checks...\n"

if [[ ! -f "$HOTSPOT_MAP_FILE" ]]; then
  printf "[owner-gate][ERROR] Missing hotspot map: %s\n" "$HOTSPOT_MAP_FILE"
  exit 1
fi

if [[ ! -f "$PR_TEMPLATE_FILE" ]]; then
  printf "[owner-gate][ERROR] Missing PR template: %s\n" "$PR_TEMPLATE_FILE"
  exit 1
fi

if ! rg -n '^## Ownership Gate' "$PR_TEMPLATE_FILE" >/dev/null; then
  printf "[owner-gate][ERROR] PR template missing 'Ownership Gate' section\n"
  has_error=1
else
  printf "[owner-gate][OK] PR template includes Ownership Gate section\n"
fi

hotspot_paths="$(rg -o '`inertia/pages/[^`]+`' "$HOTSPOT_MAP_FILE" | tr -d '`' || true)"
if [[ -z "$hotspot_paths" ]]; then
  printf "[owner-gate][ERROR] No hotspot paths found in owner map\n"
  exit 1
fi

changed_files="$(git diff --name-only --cached || true)"
if [[ -z "$changed_files" ]]; then
  changed_files="$(git diff --name-only HEAD~1..HEAD || true)"
fi

if [[ -z "$changed_files" ]]; then
  printf "[owner-gate][OK] No changed files detected for hotspot ownership check\n"
  if [[ "$has_error" -ne 0 ]]; then
    printf "\n[owner-gate] FAILED\n"
    exit 1
  fi
  printf "\n[owner-gate] PASSED\n"
  exit 0
fi

touched_hotspots=""
while IFS= read -r path; do
  [[ -z "$path" ]] && continue
  if grep -Fxq "$path" <<< "$changed_files"; then
    touched_hotspots+="$path"$'\n'
  fi
done <<< "$hotspot_paths"

if [[ -z "$touched_hotspots" ]]; then
  printf "[owner-gate][OK] No hotspot pages touched in current diff\n"
  if [[ "$has_error" -ne 0 ]]; then
    printf "\n[owner-gate] FAILED\n"
    exit 1
  fi
  printf "\n[owner-gate] PASSED\n"
  exit 0
fi

printf "\n[owner-gate] Hotspot pages touched:\n%s" "$touched_hotspots"

ownership_issues=""
while IFS= read -r hotspot; do
  [[ -z "$hotspot" ]] && continue

  row="$(grep -F "\`$hotspot\`" "$HOTSPOT_MAP_FILE" || true)"
  if [[ -z "$row" ]]; then
    ownership_issues+="missing-row:$hotspot"$'\n'
    continue
  fi

  if [[ "$row" == *'| `TBD` |'* ]]; then
    ownership_issues+="tbd-fields:$hotspot"$'\n'
  fi
done <<< "$touched_hotspots"

if [[ -n "$ownership_issues" ]]; then
  if [[ "$FAIL_MODE" == "1" ]]; then
    printf "\n[owner-gate][ERROR] Ownership gate violations (fail mode):\n%s" "$ownership_issues"
    has_error=1
  else
    printf "\n[owner-gate][WARN] Ownership gate warnings:\n%s" "$ownership_issues"
    printf "[owner-gate][INFO] Set HOTSPOT_OWNER_GATE_FAIL=1 to enforce hard-fail mode\n"
  fi
else
  printf "\n[owner-gate][OK] All touched hotspot rows have owner fields filled\n"
fi

if [[ "$has_error" -ne 0 ]]; then
  printf "\n[owner-gate] FAILED\n"
  exit 1
fi

printf "\n[owner-gate] PASSED\n"
