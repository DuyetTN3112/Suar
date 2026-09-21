#!/usr/bin/env sh
set -eu

: "${PG_TEST_DATABASE:?PG_TEST_DATABASE is required}"

cross-env PG_DATABASE="$PG_TEST_DATABASE" node ace migration:run --force --no-schema-generate
