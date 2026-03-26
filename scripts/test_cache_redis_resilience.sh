#!/usr/bin/env sh
set -eu

PROJECT_ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
COMPOSE_FILE=${CACHE_REDIS_COMPOSE_FILE:-/home/tranngocduyet/Scripts/laragon-linux/docker-compose.yml}
UNAVAILABLE_PORT=${CACHE_UNAVAILABLE_PORT:-16398}
RECOVERY_DIR=
OUTAGE_GATE=
RESTORE_GATE=
TEST_LOG=
TEST_PID=
CACHE_TOUCHED=0
PROMETHEUS_URL=

fail() {
  echo "[cache-resilience][ERROR] $*" >&2
  exit 1
}

compose() {
  docker compose -f "$COMPOSE_FILE" "$@"
}

container_health() {
  container_id=$1
  docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{end}}' "$container_id" \
    2>/dev/null || true
}

redis_config() {
  container_id=$1
  setting=$2
  docker exec "$container_id" redis-cli --raw CONFIG GET "$setting" | tail -1
}

wait_for_cache_health() {
  attempt=0
  while [ "$attempt" -lt 30 ]; do
    cache_id=$(compose ps -q redis-cache 2>/dev/null || true)
    if [ -n "$cache_id" ] && [ "$(container_health "$cache_id")" = healthy ]; then
      return 0
    fi
    attempt=$((attempt + 1))
    sleep 1
  done

  return 1
}

restore_cache() {
  compose up -d redis-cache >/dev/null
  wait_for_cache_health
}

wait_for_marker() {
  marker=$1
  attempt=0
  while [ "$attempt" -lt 300 ]; do
    if rg -q "$marker" "$TEST_LOG" 2>/dev/null; then
      return 0
    fi
    if ! kill -0 "$TEST_PID" 2>/dev/null; then
      tail -60 "$TEST_LOG" >&2
      return 1
    fi
    attempt=$((attempt + 1))
    sleep 0.1
  done

  tail -60 "$TEST_LOG" >&2
  return 1
}

query_cache_up() {
  curl --fail --silent --get \
    --data-urlencode 'query=redis_up{job="redis-cache"}' \
    "$PROMETHEUS_URL/api/v1/query" |
    jq -r '.data.result[0].value[1] // empty'
}

wait_for_cache_metric() {
  expected=$1
  attempt=0
  while [ "$attempt" -lt 30 ]; do
    observed=$(query_cache_up)
    if [ "$observed" = "$expected" ]; then
      return 0
    fi
    attempt=$((attempt + 1))
    sleep 1
  done

  return 1
}

wait_for_cache_alert_pending() {
  attempt=0
  while [ "$attempt" -lt 30 ]; do
    alert_state=$(
      curl --fail --silent "$PROMETHEUS_URL/api/v1/alerts" |
        jq -r \
          '.data.alerts[] | select(.labels.alertname == "RedisCacheUnavailable") | .state' |
        head -1
    )
    if [ "$alert_state" = pending ]; then
      return 0
    fi
    attempt=$((attempt + 1))
    sleep 1
  done

  return 1
}

cleanup() {
  original_status=$?
  trap - EXIT INT TERM
  set +e

  if [ -n "$TEST_PID" ] && kill -0 "$TEST_PID" 2>/dev/null; then
    kill "$TEST_PID" 2>/dev/null
    wait "$TEST_PID" 2>/dev/null
  fi

  restore_status=0
  if [ "$CACHE_TOUCHED" -eq 1 ]; then
    restore_cache
    restore_status=$?
  fi

  if [ -n "$RECOVERY_DIR" ]; then
    rm -f "$OUTAGE_GATE" "$RESTORE_GATE" "$TEST_LOG"
    rmdir "$RECOVERY_DIR" 2>/dev/null
  fi

  postgres_after=$(compose ps -q postgres 2>/dev/null || true)
  elasticsearch_after=$(compose ps -q elasticsearch 2>/dev/null || true)
  cache_test_after=$(compose ps -q redis-cache-test 2>/dev/null || true)
  exporter_main_after=$(compose ps -q redis-exporter-main 2>/dev/null || true)
  exporter_cache_after=$(compose ps -q redis-exporter-cache 2>/dev/null || true)
  prometheus_after=$(compose ps -q redis-prometheus 2>/dev/null || true)
  if [ "$postgres_after" != "$POSTGRES_BEFORE" ] ||
    [ "$elasticsearch_after" != "$ELASTICSEARCH_BEFORE" ] ||
    [ "$cache_test_after" != "$CACHE_TEST_BEFORE" ] ||
    [ "$exporter_main_after" != "$EXPORTER_MAIN_BEFORE" ] ||
    [ "$exporter_cache_after" != "$EXPORTER_CACHE_BEFORE" ] ||
    [ "$prometheus_after" != "$PROMETHEUS_BEFORE" ]; then
    echo "[cache-resilience][ERROR] a protected dependency or monitoring container identity changed" >&2
    original_status=1
  fi
  if [ "$restore_status" -ne 0 ]; then
    echo "[cache-resilience][ERROR] cache Redis did not recover to healthy" >&2
    original_status=1
  fi

  exit "$original_status"
}

[ "${CACHE_CHAOS_CONFIRM:-}" = local-only ] ||
  fail "set CACHE_CHAOS_CONFIRM=local-only to acknowledge a local cache stop/start drill"
[ -f "$COMPOSE_FILE" ] || fail "Compose file does not exist: $COMPOSE_FILE"
command -v docker >/dev/null 2>&1 || fail "docker is required"
command -v rg >/dev/null 2>&1 || fail "rg is required"
command -v ss >/dev/null 2>&1 || fail "ss is required"
command -v curl >/dev/null 2>&1 || fail "curl is required"
command -v jq >/dev/null 2>&1 || fail "jq is required"

services=$(compose config --services)
printf '%s\n' "$services" | rg -qx redis-cache || fail "Compose service redis-cache is missing"
printf '%s\n' "$services" | rg -qx redis-cache-test ||
  fail "Compose service redis-cache-test is missing"
printf '%s\n' "$services" | rg -qx redis || fail "Compose service redis is missing"
printf '%s\n' "$services" | rg -qx postgres || fail "Compose service postgres is missing"
printf '%s\n' "$services" | rg -qx elasticsearch || fail "Compose service elasticsearch is missing"
printf '%s\n' "$services" | rg -qx redis-exporter-main ||
  fail "Compose service redis-exporter-main is missing"
printf '%s\n' "$services" | rg -qx redis-exporter-cache ||
  fail "Compose service redis-exporter-cache is missing"
printf '%s\n' "$services" | rg -qx redis-prometheus ||
  fail "Compose service redis-prometheus is missing"

CACHE_BEFORE=$(compose ps -q redis-cache)
CACHE_TEST_BEFORE=$(compose ps -q redis-cache-test)
MAIN_BEFORE=$(compose ps -q redis)
POSTGRES_BEFORE=$(compose ps -q postgres)
ELASTICSEARCH_BEFORE=$(compose ps -q elasticsearch)
EXPORTER_MAIN_BEFORE=$(compose ps -q redis-exporter-main)
EXPORTER_CACHE_BEFORE=$(compose ps -q redis-exporter-cache)
PROMETHEUS_BEFORE=$(compose ps -q redis-prometheus)
[ -n "$CACHE_BEFORE" ] || fail "redis-cache must already be running"
[ -n "$CACHE_TEST_BEFORE" ] || fail "redis-cache-test must already be running"
[ -n "$MAIN_BEFORE" ] || fail "main redis must already be running"
[ -n "$POSTGRES_BEFORE" ] || fail "PostgreSQL must already be running"
[ -n "$ELASTICSEARCH_BEFORE" ] || fail "Elasticsearch must already be running"
[ -n "$EXPORTER_MAIN_BEFORE" ] || fail "main Redis exporter must already be running"
[ -n "$EXPORTER_CACHE_BEFORE" ] || fail "cache Redis exporter must already be running"
[ -n "$PROMETHEUS_BEFORE" ] || fail "Redis Prometheus must already be running"
[ "$CACHE_BEFORE" != "$MAIN_BEFORE" ] || fail "main and cache Redis resolve to the same container"
[ "$CACHE_TEST_BEFORE" != "$CACHE_BEFORE" ] ||
  fail "cache development and cache test resolve to the same container"
[ "$CACHE_TEST_BEFORE" != "$MAIN_BEFORE" ] ||
  fail "main and cache test Redis resolve to the same container"
[ "$(container_health "$CACHE_BEFORE")" = healthy ] || fail "redis-cache is not healthy"
[ "$(container_health "$CACHE_TEST_BEFORE")" = healthy ] ||
  fail "redis-cache-test is not healthy"
[ "$(container_health "$MAIN_BEFORE")" = healthy ] || fail "main redis is not healthy"
[ "$(container_health "$PROMETHEUS_BEFORE")" = healthy ] ||
  fail "Redis Prometheus is not healthy"

for cache_id in "$CACHE_BEFORE" "$CACHE_TEST_BEFORE"; do
  [ "$(redis_config "$cache_id" databases)" = 1 ] ||
    fail "cache Redis must expose only DB0"
  [ "$(redis_config "$cache_id" appendonly)" = no ] ||
    fail "cache Redis persistence must be disabled"
  [ -z "$(redis_config "$cache_id" save)" ] ||
    fail "cache Redis snapshotting must be disabled"
  [ "$(redis_config "$cache_id" maxmemory-policy)" = allkeys-lfu ] ||
    fail "cache Redis must use allkeys-lfu"
  [ "$(redis_config "$cache_id" maxmemory)" -gt 0 ] ||
    fail "cache Redis must have a maxmemory ceiling"

  cache_user=$(docker inspect --format '{{.Config.User}}' "$cache_id")
  [ -n "$cache_user" ] && [ "$cache_user" != root ] && [ "$cache_user" != 0 ] ||
    fail "cache Redis must run as a named non-root user"
  [ "$(docker inspect --format '{{.HostConfig.ReadonlyRootfs}}' "$cache_id")" = true ] ||
    fail "cache Redis root filesystem must be read-only"
  docker inspect --format '{{json .HostConfig.CapDrop}}' "$cache_id" | rg -q '"ALL"' ||
    fail "cache Redis must drop all Linux capabilities"
  docker inspect --format '{{json .HostConfig.SecurityOpt}}' "$cache_id" |
    rg -q 'no-new-privileges:true' ||
    fail "cache Redis must enable no-new-privileges"
  [ -z "$(docker inspect --format '{{range .Mounts}}{{if eq .Destination "/data"}}{{.Type}}{{end}}{{end}}' "$cache_id")" ] ||
    fail "cache Redis /data must be ephemeral tmpfs, not a Docker volume"
done

[ "$(redis_config "$CACHE_BEFORE" maxclients)" -le 1000 ] ||
  fail "development cache Redis maxclients must be bounded at 1000 or lower"
[ "$(redis_config "$CACHE_TEST_BEFORE" maxclients)" -le 256 ] ||
  fail "test cache Redis maxclients must be bounded at 256 or lower"

CACHE_BINDING=$(docker port "$CACHE_BEFORE" 6379/tcp | head -1)
case "$CACHE_BINDING" in
127.0.0.1:*) ;;
*) fail "redis-cache must publish only to IPv4 loopback, got: $CACHE_BINDING" ;;
esac
CACHE_PORT=${CACHE_BINDING##*:}
[ "$CACHE_PORT" -ne 6379 ] || fail "cache Redis must not reuse the main Redis host port"

CACHE_TEST_BINDING=$(docker port "$CACHE_TEST_BEFORE" 6379/tcp | head -1)
case "$CACHE_TEST_BINDING" in
127.0.0.1:*) ;;
*) fail "redis-cache-test must publish only to IPv4 loopback, got: $CACHE_TEST_BINDING" ;;
esac
CACHE_TEST_PORT=${CACHE_TEST_BINDING##*:}
[ "$CACHE_TEST_PORT" -ne "$CACHE_PORT" ] ||
  fail "cache development and cache test must not share a host port"
[ "$CACHE_TEST_PORT" -ne 6379 ] || fail "cache test Redis must not reuse the main Redis host port"

PROMETHEUS_BINDING=$(docker port "$PROMETHEUS_BEFORE" 9090/tcp | head -1)
case "$PROMETHEUS_BINDING" in
127.0.0.1:*) ;;
*) fail "Redis Prometheus must publish only to IPv4 loopback, got: $PROMETHEUS_BINDING" ;;
esac
PROMETHEUS_PORT=${PROMETHEUS_BINDING##*:}
PROMETHEUS_URL="http://127.0.0.1:$PROMETHEUS_PORT"

if ss -ltnH | awk '{print $4}' | rg -q "[:.]${UNAVAILABLE_PORT}$"; then
  fail "configured unavailable port is already listening: $UNAVAILABLE_PORT"
fi

cd "$PROJECT_ROOT"
trap cleanup EXIT
trap 'exit 130' INT TERM

echo "[cache-resilience] 1/3 unused-port fail-fast"
CACHE_INTEGRATION_DRIVER=redis \
  CACHE_UNAVAILABLE_INTEGRATION=1 \
  REDIS_CACHE_TEST_HOST=127.0.0.1 \
  REDIS_CACHE_TEST_PORT="$UNAVAILABLE_PORT" \
  REDIS_CACHE_TEST_DB=0 \
  node --import=@poppinss/ts-exec bin/test.ts integration \
  --files app/modules/cache/tests/backend/integration/cache_service_unavailable.spec.ts

echo "[cache-resilience] 2/3 authorized flow during live cache outage"
CACHE_TOUCHED=1
compose stop redis-cache >/dev/null
CACHE_INTEGRATION_DRIVER=redis \
  CACHE_OUTAGE_FLOW=1 \
  CACHE_CLEANUP_ALLOW_CACHE_OUTAGE=1 \
  REDIS_CACHE_TEST_HOST=127.0.0.1 \
  REDIS_CACHE_TEST_PORT="$CACHE_PORT" \
  REDIS_CACHE_TEST_DB=0 \
  ALLOW_UNSAFE_TEST_DATASTORES=true \
  ALLOW_UNSAFE_TEST_DATASTORES_REASON="local cache resilience drill on verified loopback redis-cache container" \
  node --import=@poppinss/ts-exec bin/test.ts integration \
  --files app/modules/tasks/tests/backend/integration/list_tasks_cache_outage.spec.ts
wait_for_cache_metric 0 || fail "Prometheus did not observe cache Redis as unavailable"
wait_for_cache_alert_pending || fail "RedisCacheUnavailable alert did not become pending"
restore_cache || fail "redis-cache did not become healthy after the outage-flow test"
wait_for_cache_metric 1 || fail "Prometheus did not observe cache Redis recovery"

echo "[cache-resilience] 3/3 same-process reconnect after live stop/start"
RECOVERY_DIR=$(mktemp -d /tmp/suar-cache-recovery.XXXXXX)
OUTAGE_GATE="$RECOVERY_DIR/outage.gate"
RESTORE_GATE="$RECOVERY_DIR/restore.gate"
TEST_LOG="$RECOVERY_DIR/test.log"

CACHE_INTEGRATION_DRIVER=redis \
  CACHE_RECOVERY_FLOW=1 \
CACHE_RECOVERY_OUTAGE_GATE="$OUTAGE_GATE" \
CACHE_RECOVERY_RESTORE_GATE="$RESTORE_GATE" \
  REDIS_CACHE_TEST_HOST=127.0.0.1 \
  REDIS_CACHE_TEST_PORT="$CACHE_PORT" \
  REDIS_CACHE_TEST_DB=0 \
  ALLOW_UNSAFE_TEST_DATASTORES=true \
  ALLOW_UNSAFE_TEST_DATASTORES_REASON="local cache resilience drill on verified loopback redis-cache container" \
  node --import=@poppinss/ts-exec bin/test.ts integration \
  --files app/modules/cache/tests/backend/integration/cache_service_recovery.spec.ts \
  >"$TEST_LOG" 2>&1 &
TEST_PID=$!

wait_for_marker CACHE_RECOVERY_READY_FOR_OUTAGE ||
  fail "recovery test never became ready for the outage"
compose stop redis-cache >/dev/null
touch "$OUTAGE_GATE"
wait_for_marker CACHE_RECOVERY_OUTAGE_OBSERVED ||
  fail "existing client did not observe a fail-fast cache outage"
restore_cache || fail "redis-cache did not become healthy during the recovery test"
touch "$RESTORE_GATE"
if ! wait "$TEST_PID"; then
  TEST_PID=
  tail -60 "$TEST_LOG" >&2
  fail "same-process cache recovery test failed"
fi
TEST_PID=
sed -n '1,240p' "$TEST_LOG"

wait_for_cache_health || fail "redis-cache is not healthy after the drill"
[ "$(compose ps -q redis)" = "$MAIN_BEFORE" ] || fail "main Redis container identity changed"
[ "$(compose ps -q postgres)" = "$POSTGRES_BEFORE" ] ||
  fail "PostgreSQL container identity changed"
[ "$(compose ps -q elasticsearch)" = "$ELASTICSEARCH_BEFORE" ] ||
  fail "Elasticsearch container identity changed"
[ "$(compose ps -q redis-cache-test)" = "$CACHE_TEST_BEFORE" ] ||
  fail "cache test Redis container identity changed"
[ "$(compose ps -q redis-exporter-main)" = "$EXPORTER_MAIN_BEFORE" ] ||
  fail "main Redis exporter container identity changed"
[ "$(compose ps -q redis-exporter-cache)" = "$EXPORTER_CACHE_BEFORE" ] ||
  fail "cache Redis exporter container identity changed"
[ "$(compose ps -q redis-prometheus)" = "$PROMETHEUS_BEFORE" ] ||
  fail "Redis Prometheus container identity changed"

echo "[cache-resilience][OK] fail-fast, fallback, alerting, recovery, and dependency isolation passed"
