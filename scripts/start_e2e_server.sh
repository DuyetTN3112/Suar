#!/usr/bin/env sh
set -eu

REQUESTED_PORT="${PORT:-}"
REQUESTED_PG_TEST_DATABASE="${PG_TEST_DATABASE:-}"

if [ -f .env ]; then
  set -a
  . ./.env
  set +a
fi

if [ -n "$REQUESTED_PORT" ]; then
  export PORT="$REQUESTED_PORT"
fi

if [ -n "$REQUESTED_PG_TEST_DATABASE" ]; then
  export PG_TEST_DATABASE="$REQUESTED_PG_TEST_DATABASE"
fi

: "${PG_TEST_DATABASE:?PG_TEST_DATABASE is required for Playwright E2E runs}"

export NODE_ENV=test
export LOG_LEVEL="${E2E_LOG_LEVEL:-silent}"
export PORT="${PORT:-3333}"
export DISABLE_RATE_LIMITING="${DISABLE_RATE_LIMITING:-true}"
export PG_TEST_DATABASE
export PG_DATABASE="$PG_TEST_DATABASE"

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

if [ "${E2E_SERVER_WATCH:-false}" = "true" ]; then
  exec node ace serve --watch --no-clear
fi

exec node ace serve --no-clear
