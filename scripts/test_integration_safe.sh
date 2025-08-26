#!/usr/bin/env sh
set -eu

# Load environment variables from .env file
if [ -f .env ]; then
  set -a
  . ./.env
  set +a
fi

: "${PG_TEST_DATABASE:?PG_TEST_DATABASE is required}"
: "${MONGODB_TEST_URL:?MONGODB_TEST_URL is required}"

npm run db:test:migrate

PG_DATABASE="$PG_TEST_DATABASE" \
MONGODB_URL="$MONGODB_TEST_URL" \
PG_TEST_DATABASE="$PG_TEST_DATABASE" \
MONGODB_TEST_URL="$MONGODB_TEST_URL" \
node --import=@poppinss/ts-exec bin/test.ts integration
