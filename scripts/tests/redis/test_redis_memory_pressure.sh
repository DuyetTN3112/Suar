#!/usr/bin/env sh
set -eu

COMPOSE_FILE=${CACHE_REDIS_COMPOSE_FILE:-/home/tranngocduyet/Scripts/laragon-linux/docker-compose.yml}
DRILL_MAXMEMORY_BYTES=16777216
CACHE_DRILL_CONTAINER="suar-redis-cache-pressure-$$"
MAIN_DRILL_CONTAINER="suar-redis-main-pressure-$$"
CACHE_DRILL_STARTED=0
MAIN_DRILL_STARTED=0

fail() {
  echo "[redis-memory-pressure][ERROR] $*" >&2
  exit 1
}

compose() {
  docker compose -f "$COMPOSE_FILE" "$@"
}

redis_field() {
  container_name=$1
  section=$2
  field_name=$3
  docker exec "$container_name" redis-cli --raw INFO "$section" |
    tr -d '\r' |
    awk -F: -v field="$field_name" '$1 == field { print $2 }'
}

redis_config() {
  container_name=$1
  field_name=$2
  docker exec "$container_name" redis-cli --raw CONFIG GET "$field_name" | tail -1
}

wait_for_ping() {
  container_name=$1
  attempt=0
  while [ "$attempt" -lt 30 ]; do
    if [ "$(docker exec "$container_name" redis-cli --raw PING 2>/dev/null || true)" = PONG ]; then
      return 0
    fi
    attempt=$((attempt + 1))
    sleep 0.25
  done

  return 1
}

start_drill_redis() {
  container_name=$1
  eviction_policy=$2
  docker run -d \
    --rm \
    --name "$container_name" \
    --network none \
    --user "$(id -u):$(id -g)" \
    --read-only \
    --tmpfs /data:size=32m,mode=1777 \
    --security-opt no-new-privileges:true \
    --cap-drop ALL \
    --memory 96m \
    --cpus 0.5 \
    --pids-limit 100 \
    "$REDIS_IMAGE" \
    redis-server \
    --save "" \
    --appendonly no \
    --maxmemory "$DRILL_MAXMEMORY_BYTES" \
    --maxmemory-policy "$eviction_policy" \
    --protected-mode yes \
    >/dev/null
  wait_for_ping "$container_name"
}

cleanup() {
  original_status=$?
  trap - EXIT INT TERM
  set +e

  if [ "$CACHE_DRILL_STARTED" -eq 1 ]; then
    docker stop "$CACHE_DRILL_CONTAINER" >/dev/null 2>&1
  fi
  if [ "$MAIN_DRILL_STARTED" -eq 1 ]; then
    docker stop "$MAIN_DRILL_CONTAINER" >/dev/null 2>&1
  fi

  if [ "$(compose ps -q redis 2>/dev/null || true)" != "$MAIN_ID" ] ||
    [ "$(compose ps -q redis-cache 2>/dev/null || true)" != "$CACHE_ID" ] ||
    [ "$(compose ps -q postgres 2>/dev/null || true)" != "$POSTGRES_ID" ] ||
    [ "$(compose ps -q elasticsearch 2>/dev/null || true)" != "$ELASTICSEARCH_ID" ]; then
    echo "[redis-memory-pressure][ERROR] a protected runtime container identity changed" >&2
    original_status=1
  fi

  exit "$original_status"
}

[ "${REDIS_MEMORY_DRILL_CONFIRM:-}" = local-only ] ||
  fail "set REDIS_MEMORY_DRILL_CONFIRM=local-only to acknowledge an isolated Redis pressure drill"
[ -f "$COMPOSE_FILE" ] || fail "Compose file does not exist: $COMPOSE_FILE"
command -v docker >/dev/null 2>&1 || fail "docker is required"
command -v openssl >/dev/null 2>&1 || fail "openssl is required"

MAIN_ID=$(compose ps -q redis)
CACHE_ID=$(compose ps -q redis-cache)
POSTGRES_ID=$(compose ps -q postgres)
ELASTICSEARCH_ID=$(compose ps -q elasticsearch)
[ -n "$MAIN_ID" ] || fail "main Redis must already be running"
[ -n "$CACHE_ID" ] || fail "cache Redis must already be running"
[ -n "$POSTGRES_ID" ] || fail "PostgreSQL must already be running"
[ -n "$ELASTICSEARCH_ID" ] || fail "Elasticsearch must already be running"
[ "$MAIN_ID" != "$CACHE_ID" ] || fail "main and cache Redis must be separate containers"

[ "$(redis_config "$MAIN_ID" maxmemory-policy)" = noeviction ] ||
  fail "running main Redis is not configured noeviction"
[ "$(redis_config "$CACHE_ID" maxmemory-policy)" = allkeys-lfu ] ||
  fail "running cache Redis is not configured allkeys-lfu"
MAIN_MAXMEMORY=$(redis_config "$MAIN_ID" maxmemory)
CACHE_MAXMEMORY=$(redis_config "$CACHE_ID" maxmemory)
[ "$MAIN_MAXMEMORY" -gt 0 ] || fail "running main Redis has no maxmemory"
[ "$CACHE_MAXMEMORY" -gt 0 ] || fail "running cache Redis has no maxmemory"
MAIN_CONTAINER_MEMORY=$(docker inspect --format '{{.HostConfig.Memory}}' "$MAIN_ID")
CACHE_CONTAINER_MEMORY=$(docker inspect --format '{{.HostConfig.Memory}}' "$CACHE_ID")
[ "$MAIN_CONTAINER_MEMORY" -gt "$MAIN_MAXMEMORY" ] ||
  fail "main Redis container ceiling must exceed Redis maxmemory"
[ "$CACHE_CONTAINER_MEMORY" -gt "$CACHE_MAXMEMORY" ] ||
  fail "cache Redis container ceiling must exceed Redis maxmemory"

MEMORY_AVAILABLE_KIB=$(awk '/^MemAvailable:/ { print $2 }' /proc/meminfo)
[ "$MEMORY_AVAILABLE_KIB" -gt 524288 ] ||
  fail "host has less than 512 MiB available memory"

REDIS_IMAGE=$(docker inspect --format '{{.Config.Image}}' "$MAIN_ID")
trap cleanup EXIT
trap 'exit 130' INT TERM

CACHE_DRILL_STARTED=1
start_drill_redis "$CACHE_DRILL_CONTAINER" allkeys-lfu ||
  fail "isolated cache-policy Redis did not become ready"
docker exec "$CACHE_DRILL_CONTAINER" \
  redis-benchmark -q -t set -n 50000 -r 50000 -d 1024 -P 16 \
  >/dev/null

CACHE_EVICTED=$(redis_field "$CACHE_DRILL_CONTAINER" stats evicted_keys)
CACHE_ERRORS=$(redis_field "$CACHE_DRILL_CONTAINER" stats total_error_replies)
[ "$CACHE_EVICTED" -gt 0 ] || fail "allkeys-lfu did not evict under pressure"
[ "$CACHE_ERRORS" -eq 0 ] || fail "allkeys-lfu rejected writes under the bounded drill"
CACHE_PROBE_VALUE=$(openssl rand -hex 1024)
[ "$(docker exec "$CACHE_DRILL_CONTAINER" redis-cli --raw SET pressure:probe "$CACHE_PROBE_VALUE")" = OK ] ||
  fail "cache Redis could not write after reaching maxmemory"
[ "$(docker exec "$CACHE_DRILL_CONTAINER" redis-cli --raw GET pressure:probe)" = "$CACHE_PROBE_VALUE" ] ||
  fail "cache Redis did not read the post-pressure probe"

MAIN_DRILL_STARTED=1
start_drill_redis "$MAIN_DRILL_CONTAINER" noeviction ||
  fail "isolated main-policy Redis did not become ready"
MAIN_SENTINEL_VALUE=$(openssl rand -hex 64)
[ "$(docker exec "$MAIN_DRILL_CONTAINER" redis-cli --raw SET pressure:sentinel "$MAIN_SENTINEL_VALUE")" = OK ] ||
  fail "main-policy sentinel write failed before pressure"
docker exec "$MAIN_DRILL_CONTAINER" \
  redis-benchmark -q -t set -n 50000 -r 50000 -d 1024 -P 16 \
  >/dev/null 2>&1 ||
  true

MAIN_EVICTED=$(redis_field "$MAIN_DRILL_CONTAINER" stats evicted_keys)
MAIN_ERRORS=$(redis_field "$MAIN_DRILL_CONTAINER" stats total_error_replies)
[ "$MAIN_EVICTED" -eq 0 ] || fail "noeviction removed existing keys"
[ "$MAIN_ERRORS" -gt 0 ] || fail "noeviction did not reject writes at maxmemory"
[ "$(docker exec "$MAIN_DRILL_CONTAINER" redis-cli --raw GET pressure:sentinel)" = "$MAIN_SENTINEL_VALUE" ] ||
  fail "noeviction lost an existing key"
MAIN_PROBE_VALUE=$(openssl rand -hex 2048)
MAIN_PROBE_INDEX=0
MAIN_REJECTION_OBSERVED=0
while [ "$MAIN_PROBE_INDEX" -lt 1000 ]; do
  MAIN_PROBE_KEY="pressure:probe:$MAIN_PROBE_INDEX"
  docker exec "$MAIN_DRILL_CONTAINER" \
    redis-cli --raw SET "$MAIN_PROBE_KEY" "$MAIN_PROBE_VALUE" \
    >/dev/null 2>&1 ||
    true
  if [ "$(docker exec "$MAIN_DRILL_CONTAINER" redis-cli --raw EXISTS "$MAIN_PROBE_KEY")" -eq 0 ]; then
    MAIN_REJECTION_OBSERVED=1
    break
  fi
  MAIN_PROBE_INDEX=$((MAIN_PROBE_INDEX + 1))
done
[ "$MAIN_REJECTION_OBSERVED" -eq 1 ] ||
  fail "noeviction admitted every bounded probe instead of enforcing maxmemory"
[ "$(docker exec "$MAIN_DRILL_CONTAINER" redis-cli --raw GET pressure:sentinel)" = "$MAIN_SENTINEL_VALUE" ] ||
  fail "noeviction lost the sentinel while approaching the final write boundary"

echo "[redis-memory-pressure][OK] cache evicted and remained writable; main retained data and rejected writes"
echo "[redis-memory-pressure] cache_evicted=$CACHE_EVICTED cache_errors=$CACHE_ERRORS main_evicted=$MAIN_EVICTED main_errors=$MAIN_ERRORS"
