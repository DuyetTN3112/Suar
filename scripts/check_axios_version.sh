#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

EXPECTED_VERSION="1.13.6"

declared_version="$(node -p "require('./package.json').dependencies?.axios || ''")"

if [[ "$declared_version" != "$EXPECTED_VERSION" ]]; then
  echo "[deps-check][ERROR] axios version drift detected in package.json"
  echo "Expected: $EXPECTED_VERSION"
  echo "Found:    ${declared_version:-<missing>}"
  exit 1
fi

if [[ -f "pnpm-lock.yaml" ]]; then
  if ! rg -n "^\s*axios@${EXPECTED_VERSION}:" pnpm-lock.yaml >/dev/null; then
    echo "[deps-check][ERROR] axios lock entry for ${EXPECTED_VERSION} not found in pnpm-lock.yaml"
    echo "Run install with pinned dependency or update lockfile to match package.json"
    exit 1
  fi
fi

echo "[deps-check][OK] axios is pinned and validated at version ${EXPECTED_VERSION}"
