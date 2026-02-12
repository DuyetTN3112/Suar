#!/usr/bin/env sh
set -eu

REQUESTED_PORT="${PORT:-}"
REQUESTED_PG_HOST="${PG_HOST:-}"
REQUESTED_PG_PORT="${PG_PORT:-}"
REQUESTED_PG_USER="${PG_USER:-}"
REQUESTED_PG_PASSWORD="${PG_PASSWORD:-}"
REQUESTED_PG_TEST_DATABASE="${PG_TEST_DATABASE:-}"
REQUESTED_REDIS_TEST_HOST="${REDIS_TEST_HOST:-}"
REQUESTED_REDIS_TEST_PORT="${REDIS_TEST_PORT:-}"
REQUESTED_REDIS_TEST_USERNAME="${REDIS_TEST_USERNAME:-}"
REQUESTED_REDIS_TEST_PASSWORD="${REDIS_TEST_PASSWORD:-}"
REQUESTED_REDIS_TEST_DB="${REDIS_TEST_DB:-}"
REQUESTED_REDIS_CACHE_TEST_HOST="${REDIS_CACHE_TEST_HOST:-}"
REQUESTED_REDIS_CACHE_TEST_PORT="${REDIS_CACHE_TEST_PORT:-}"
REQUESTED_REDIS_CACHE_TEST_USERNAME="${REDIS_CACHE_TEST_USERNAME:-}"
REQUESTED_REDIS_CACHE_TEST_PASSWORD="${REDIS_CACHE_TEST_PASSWORD:-}"
REQUESTED_REDIS_CACHE_TEST_DB="${REDIS_CACHE_TEST_DB:-}"
REQUESTED_CACHE_INTEGRATION_DRIVER="${CACHE_INTEGRATION_DRIVER:-}"
REQUESTED_METRICS_API_KEY="${METRICS_API_KEY:-}"
REQUESTED_ELASTICSEARCH_TEST_ENABLED="${ELASTICSEARCH_TEST_ENABLED:-}"
REQUESTED_ELASTICSEARCH_TEST_NODE="${ELASTICSEARCH_TEST_NODE:-}"
REQUESTED_ELASTICSEARCH_TEST_USERNAME="${ELASTICSEARCH_TEST_USERNAME:-}"
REQUESTED_ELASTICSEARCH_TEST_PASSWORD="${ELASTICSEARCH_TEST_PASSWORD:-}"
REQUESTED_ELASTICSEARCH_TEST_INDEX_PREFIX="${ELASTICSEARCH_TEST_INDEX_PREFIX:-}"

if [ -f .env ]; then
  set -a
  . ./.env
  set +a
fi

# Preserve the non-test cache endpoint before this script maps active variables
# to the explicit test data plane. The datastore guard uses this snapshot to
# reject logical-DB-only isolation from the development cache process.
export SUAR_TEST_BASELINE_REDIS_CACHE_CAPTURED=true
if [ -n "${REDIS_CACHE_HOST:-}" ]; then
  export SUAR_TEST_BASELINE_REDIS_CACHE_HOST="$REDIS_CACHE_HOST"
else
  unset SUAR_TEST_BASELINE_REDIS_CACHE_HOST
fi
if [ -n "${REDIS_CACHE_PORT:-}" ]; then
  export SUAR_TEST_BASELINE_REDIS_CACHE_PORT="$REDIS_CACHE_PORT"
else
  unset SUAR_TEST_BASELINE_REDIS_CACHE_PORT
fi
export SUAR_TEST_BASELINE_ELASTICSEARCH_NODE_CAPTURED=true
if [ -n "${ELASTICSEARCH_NODE:-}" ]; then
  export SUAR_TEST_BASELINE_ELASTICSEARCH_NODE="$ELASTICSEARCH_NODE"
else
  unset SUAR_TEST_BASELINE_ELASTICSEARCH_NODE
fi

if [ -n "$REQUESTED_PORT" ]; then
  export PORT="$REQUESTED_PORT"
fi

if [ -n "$REQUESTED_PG_TEST_DATABASE" ]; then
  export PG_TEST_DATABASE="$REQUESTED_PG_TEST_DATABASE"
fi

restore_requested() {
  key="$1"
  value="$2"
  if [ -n "$value" ]; then
    export "$key=$value"
  fi
}

restore_requested REDIS_TEST_HOST "$REQUESTED_REDIS_TEST_HOST"
restore_requested REDIS_TEST_PORT "$REQUESTED_REDIS_TEST_PORT"
restore_requested REDIS_TEST_USERNAME "$REQUESTED_REDIS_TEST_USERNAME"
restore_requested REDIS_TEST_PASSWORD "$REQUESTED_REDIS_TEST_PASSWORD"
restore_requested REDIS_TEST_DB "$REQUESTED_REDIS_TEST_DB"
restore_requested REDIS_CACHE_TEST_HOST "$REQUESTED_REDIS_CACHE_TEST_HOST"
restore_requested REDIS_CACHE_TEST_PORT "$REQUESTED_REDIS_CACHE_TEST_PORT"
restore_requested REDIS_CACHE_TEST_USERNAME "$REQUESTED_REDIS_CACHE_TEST_USERNAME"
restore_requested REDIS_CACHE_TEST_PASSWORD "$REQUESTED_REDIS_CACHE_TEST_PASSWORD"
restore_requested REDIS_CACHE_TEST_DB "$REQUESTED_REDIS_CACHE_TEST_DB"
restore_requested CACHE_INTEGRATION_DRIVER "$REQUESTED_CACHE_INTEGRATION_DRIVER"
restore_requested METRICS_API_KEY "$REQUESTED_METRICS_API_KEY"
restore_requested PG_HOST "$REQUESTED_PG_HOST"
restore_requested PG_PORT "$REQUESTED_PG_PORT"
restore_requested PG_USER "$REQUESTED_PG_USER"
restore_requested PG_PASSWORD "$REQUESTED_PG_PASSWORD"
restore_requested ELASTICSEARCH_TEST_ENABLED "$REQUESTED_ELASTICSEARCH_TEST_ENABLED"
restore_requested ELASTICSEARCH_TEST_NODE "$REQUESTED_ELASTICSEARCH_TEST_NODE"
restore_requested ELASTICSEARCH_TEST_USERNAME "$REQUESTED_ELASTICSEARCH_TEST_USERNAME"
restore_requested ELASTICSEARCH_TEST_PASSWORD "$REQUESTED_ELASTICSEARCH_TEST_PASSWORD"
restore_requested ELASTICSEARCH_TEST_INDEX_PREFIX "$REQUESTED_ELASTICSEARCH_TEST_INDEX_PREFIX"

: "${PG_TEST_DATABASE:?PG_TEST_DATABASE is required for Playwright E2E runs}"
: "${REDIS_TEST_HOST:?REDIS_TEST_HOST is required for Playwright E2E runs}"
: "${REDIS_TEST_PORT:?REDIS_TEST_PORT is required for Playwright E2E runs}"
: "${REDIS_TEST_DB:?REDIS_TEST_DB is required for Playwright E2E runs}"
: "${REDIS_CACHE_TEST_HOST:?REDIS_CACHE_TEST_HOST is required for Playwright E2E runs}"
: "${REDIS_CACHE_TEST_PORT:?REDIS_CACHE_TEST_PORT is required for Playwright E2E runs}"
: "${REDIS_CACHE_TEST_DB:?REDIS_CACHE_TEST_DB is required for Playwright E2E runs}"
: "${ELASTICSEARCH_TEST_NODE:?ELASTICSEARCH_TEST_NODE is required for Playwright E2E runs}"
: "${ELASTICSEARCH_TEST_INDEX_PREFIX:?ELASTICSEARCH_TEST_INDEX_PREFIX is required for Playwright E2E runs}"

export NODE_ENV=test
export LOG_LEVEL="${E2E_LOG_LEVEL:-silent}"
export PORT="${PORT:-3333}"
export DISABLE_RATE_LIMITING="${DISABLE_RATE_LIMITING:-true}"
export PG_TEST_DATABASE
export PG_DATABASE="$PG_TEST_DATABASE"
export CACHE_INTEGRATION_DRIVER=redis
export REDIS_HOST="$REDIS_TEST_HOST"
export REDIS_PORT="$REDIS_TEST_PORT"
export REDIS_DB="$REDIS_TEST_DB"
export REDIS_CACHE_HOST="$REDIS_CACHE_TEST_HOST"
export REDIS_CACHE_PORT="$REDIS_CACHE_TEST_PORT"
export REDIS_CACHE_DB="$REDIS_CACHE_TEST_DB"
export ELASTICSEARCH_TEST_ENABLED="${ELASTICSEARCH_TEST_ENABLED:-true}"
export ELASTICSEARCH_ENABLED="$ELASTICSEARCH_TEST_ENABLED"
export ELASTICSEARCH_NODE="$ELASTICSEARCH_TEST_NODE"
export ELASTICSEARCH_USERNAME="${ELASTICSEARCH_TEST_USERNAME:-}"
export ELASTICSEARCH_PASSWORD="${ELASTICSEARCH_TEST_PASSWORD:-}"
export ELASTICSEARCH_INDEX_PREFIX="$ELASTICSEARCH_TEST_INDEX_PREFIX"

if [ -n "${REDIS_TEST_USERNAME:-}" ]; then
  export REDIS_USERNAME="$REDIS_TEST_USERNAME"
else
  unset REDIS_USERNAME
fi
if [ -n "${REDIS_TEST_PASSWORD:-}" ]; then
  export REDIS_PASSWORD="$REDIS_TEST_PASSWORD"
else
  unset REDIS_PASSWORD
fi
if [ -n "${REDIS_CACHE_TEST_USERNAME:-}" ]; then
  export REDIS_CACHE_USERNAME="$REDIS_CACHE_TEST_USERNAME"
else
  unset REDIS_CACHE_USERNAME
fi
if [ -n "${REDIS_CACHE_TEST_PASSWORD:-}" ]; then
  export REDIS_CACHE_PASSWORD="$REDIS_CACHE_TEST_PASSWORD"
else
  unset REDIS_CACHE_PASSWORD
fi

node --import=@poppinss/ts-exec --input-type=module -e \
  "const guard = await import('./tests/helpers/test_datastore_guard.ts'); guard.applyTestDatastoreOverrides(); await guard.assertSafeTestDatastores();"

while IFS='=' read -r key value; do
  eval "current=\${$key:-}"
  if [ -z "$current" ]; then
    export "$key=$value"
  fi
done <<EOF
$(node --import=@poppinss/ts-exec --input-type=module <<'NODE'
import { SEED_ORGANIZATIONS_SPECS } from './app/seed/demo_data/organization_seeds_specs.ts'
import { SEED_USERS_SPECS } from './app/seed/demo_data/user_seeds_specs.ts'

const superadminDomain = SEED_USERS_SPECS.superadmin.email.split('@')[1] ?? ''
const rows = {
  SUAR_MAIN_TEST_EMAIL: SEED_USERS_SPECS.owner.email,
  SUAR_MAIN_TEST_PRIMARY_ORG_NAME: SEED_ORGANIZATIONS_SPECS.orgA.name,
  SUAR_MAIN_TEST_PRIMARY_ORG_SLUG: SEED_ORGANIZATIONS_SPECS.orgA.slug,
  SUAR_MAIN_TEST_SECONDARY_ORG_NAME: SEED_ORGANIZATIONS_SPECS.orgB.name,
  SUAR_MAIN_TEST_SECONDARY_ORG_SLUG: SEED_ORGANIZATIONS_SPECS.orgB.slug,
  SUAR_MAIN_TEST_SECONDARY_OWNER_EMAIL: SEED_USERS_SPECS.orgBOwner.email,
  SUAR_MAIN_TEST_SECONDARY_OWNER_USERNAME: SEED_USERS_SPECS.orgBOwner.username,
  SUAR_SYSTEM_ADMIN_EMAIL_DOMAIN: superadminDomain,
}

for (const [key, value] of Object.entries(rows)) {
  console.log(`${key}=${value}`)
}
NODE
)
EOF

if [ "${E2E_SKIP_DB_MIGRATE:-false}" != "true" ]; then
  pnpm run db:test:migrate
fi

cache_worker_pid=""
notification_fanout_worker_pid=""
notification_outbox_worker_pid=""
server_pid=""

stop_e2e_children() {
  if [ -n "$server_pid" ]; then
    kill -TERM "$server_pid" 2>/dev/null || true
  fi
  if [ -n "$cache_worker_pid" ]; then
    kill -TERM "$cache_worker_pid" 2>/dev/null || true
  fi
  if [ -n "$notification_fanout_worker_pid" ]; then
    kill -TERM "$notification_fanout_worker_pid" 2>/dev/null || true
  fi
  if [ -n "$notification_outbox_worker_pid" ]; then
    kill -TERM "$notification_outbox_worker_pid" 2>/dev/null || true
  fi
  if [ -n "$server_pid" ]; then
    wait "$server_pid" 2>/dev/null || true
  fi
  if [ -n "$cache_worker_pid" ]; then
    wait "$cache_worker_pid" 2>/dev/null || true
  fi
  if [ -n "$notification_fanout_worker_pid" ]; then
    wait "$notification_fanout_worker_pid" 2>/dev/null || true
  fi
  if [ -n "$notification_outbox_worker_pid" ]; then
    wait "$notification_outbox_worker_pid" 2>/dev/null || true
  fi
}

trap stop_e2e_children EXIT INT TERM

if [ "${E2E_START_CACHE_INVALIDATION_WORKER:-true}" = "true" ]; then
  node ace cache:invalidation-worker --poll-ms=100 --batch-size=25 --concurrency=1 &
  cache_worker_pid="$!"
fi

if [ "${E2E_START_NOTIFICATION_FANOUT_WORKER:-true}" = "true" ]; then
  node ace notification:fanout-work --poll-ms=100 --batch-size=25 --concurrency=1 &
  notification_fanout_worker_pid="$!"
fi

if [ "${E2E_START_NOTIFICATION_OUTBOX_WORKER:-true}" = "true" ]; then
  node ace notification:outbox-work --poll-ms=100 --batch-size=25 --concurrency=1 &
  notification_outbox_worker_pid="$!"
fi

if [ "${E2E_SERVER_WATCH:-false}" = "true" ]; then
  node ace serve --watch --no-clear &
else
  node ace serve --no-clear &
fi
server_pid="$!"

server_status=0
wait "$server_pid" || server_status="$?"
exit "$server_status"
