#!/usr/bin/env sh
set -eu

PROJECT_ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$PROJECT_ROOT"

export CACHE_INTEGRATION_DRIVER=redis

run_integration_file() {
  test_file=$1
  node --import=@poppinss/ts-exec bin/test.ts integration --files "$test_file"
}

# These files intentionally use separate Node/Japa processes. The HTTP test
# cleanup flushes the isolated cache-test Redis database, while the single-flight
# tests hold short-lived distributed locks. Running them inside one Japa import
# graph allows lifecycle cleanup to invalidate another file's in-flight lock.
run_integration_file app/modules/cache/tests/backend/integration/cache_service_redis.spec.ts
run_integration_file app/modules/cache/tests/backend/integration/cache_singleflight_multiprocess.spec.ts
run_integration_file app/modules/notifications/tests/backend/integration/notification_unread_cache_redis.spec.ts
run_integration_file app/modules/http/tests/backend/integration/redis_api_standardization.spec.ts
run_integration_file app/modules/http/tests/backend/integration/cache_metrics_endpoint.spec.ts
