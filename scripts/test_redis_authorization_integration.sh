#!/usr/bin/env sh
set -eu

PROJECT_ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$PROJECT_ROOT"

export CACHE_INTEGRATION_DRIVER=redis

run_integration_file() {
  test_file=$1
  node --import=@poppinss/ts-exec bin/test.ts integration --files "$test_file"
}

# These database-backed cache authorization/invalidation flows run only after
# the safe PostgreSQL integration bootstrap. Keep separate processes so schema
# teardown and cache cleanup cannot overlap another file's in-flight work.
run_integration_file app/modules/cache/tests/backend/integration/cache_invalidation_outbox_redis.spec.ts
run_integration_file app/modules/tasks/tests/backend/integration/task_collection_generation_cache.spec.ts
run_integration_file app/modules/tasks/tests/backend/integration/task_metadata_query.spec.ts
