#!/usr/bin/env sh
set -eu

REPO_ROOT="$(git rev-parse --show-toplevel)"
GITLEAKS_IMAGE='zricethezav/gitleaks@sha256:0e99e8821643ea5b235718642b93bb32486af9c8162c8b8731f7cbdc951a7f46'

if ! command -v docker >/dev/null 2>&1; then
  echo 'Docker is required for staged secret scanning.' >&2
  exit 1
fi

docker run --rm \
  -v "${REPO_ROOT}:/repo:ro" \
  -w /repo \
  "${GITLEAKS_IMAGE}" \
  protect --staged --redact --no-banner
