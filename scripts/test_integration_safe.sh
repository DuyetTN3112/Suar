#!/usr/bin/env sh
set -eu

# Load environment variables from .env file
if [ -f .env ]; then
  set -a
  . ./.env
  set +a
fi

: "${PG_TEST_DATABASE:?PG_TEST_DATABASE is required}"

pnpm run db:test:migrate
pnpm exec vite build

PG_DATABASE="$PG_TEST_DATABASE" \
PG_TEST_DATABASE="$PG_TEST_DATABASE" \
node --import=@poppinss/ts-exec bin/test.ts integration
