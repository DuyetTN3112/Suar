#!/usr/bin/env sh
set -eu

PROJECT_ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
COMPOSE_FILE=${CACHE_REDIS_COMPOSE_FILE:-/home/tranngocduyet/Scripts/laragon-linux/docker-compose.yml}
BACKUP_DIR=
BACKUP_FILE=
RESTORE_CONTAINER="suar-redis-restore-drill-$$"
RESTORE_STARTED=0
DRILL_KEY=
DRILL_VALUE=
DRILL_KEY_CREATED=0

fail() {
  echo "[redis-backup-restore][ERROR] $*" >&2
  exit 1
}

compose() {
  docker compose -f "$COMPOSE_FILE" "$@"
}

redis_main() {
  docker exec "$MAIN_ID" redis-cli --raw "$@"
}

persistence_field() {
  field_name=$1
  redis_main INFO persistence |
    tr -d '\r' |
    awk -F: -v field="$field_name" '$1 == field { print $2 }'
}

wait_for_persistence_idle() {
  attempt=0
  while [ "$attempt" -lt 60 ]; do
    if [ "$(persistence_field rdb_bgsave_in_progress)" = 0 ] &&
      [ "$(persistence_field aof_rewrite_in_progress)" = 0 ] &&
      [ "$(persistence_field aof_rewrite_scheduled)" = 0 ]; then
      return 0
    fi
    attempt=$((attempt + 1))
    sleep 0.25
  done

  return 1
}

create_fresh_rdb() {
  wait_for_persistence_idle || return 1
  redis_main BGSAVE >/dev/null || return 1
  wait_for_persistence_idle || return 1
  [ "$(persistence_field rdb_last_bgsave_status)" = ok ]
}

remove_drill_key_and_snapshot() {
  redis_main DEL "$DRILL_KEY" >/dev/null || return 1
  create_fresh_rdb || return 1
  DRILL_KEY_CREATED=0
}

cleanup() {
  original_status=$?
  trap - EXIT INT TERM
  set +e

  if [ "$RESTORE_STARTED" -eq 1 ]; then
    docker stop "$RESTORE_CONTAINER" >/dev/null 2>&1
  fi

  if [ "$DRILL_KEY_CREATED" -eq 1 ]; then
    remove_drill_key_and_snapshot
    if [ "$?" -ne 0 ]; then
      echo "[redis-backup-restore][ERROR] failed to remove the drill key or refresh the live RDB" >&2
      original_status=1
    fi
  fi

  if [ -n "$BACKUP_DIR" ]; then
    rm -f "$BACKUP_FILE"
    rmdir "$BACKUP_DIR" 2>/dev/null
  fi

  if [ "$(compose ps -q redis 2>/dev/null || true)" != "$MAIN_ID" ] ||
    [ "$(compose ps -q redis-cache 2>/dev/null || true)" != "$CACHE_ID" ] ||
    [ "$(compose ps -q postgres 2>/dev/null || true)" != "$POSTGRES_ID" ] ||
    [ "$(compose ps -q elasticsearch 2>/dev/null || true)" != "$ELASTICSEARCH_ID" ]; then
    echo "[redis-backup-restore][ERROR] a protected runtime container identity changed" >&2
    original_status=1
  fi

  exit "$original_status"
}

[ "${REDIS_BACKUP_DRILL_CONFIRM:-}" = local-only ] ||
  fail "set REDIS_BACKUP_DRILL_CONFIRM=local-only to acknowledge a local main-Redis snapshot drill"
[ -f "$COMPOSE_FILE" ] || fail "Compose file does not exist: $COMPOSE_FILE"
command -v docker >/dev/null 2>&1 || fail "docker is required"
command -v openssl >/dev/null 2>&1 || fail "openssl is required"
command -v sha256sum >/dev/null 2>&1 || fail "sha256sum is required"

MAIN_ID=$(compose ps -q redis)
CACHE_ID=$(compose ps -q redis-cache)
POSTGRES_ID=$(compose ps -q postgres)
ELASTICSEARCH_ID=$(compose ps -q elasticsearch)
[ -n "$MAIN_ID" ] || fail "main Redis must already be running"
[ -n "$CACHE_ID" ] || fail "cache Redis must already be running"
[ -n "$POSTGRES_ID" ] || fail "PostgreSQL must already be running"
[ -n "$ELASTICSEARCH_ID" ] || fail "Elasticsearch must already be running"
[ "$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{end}}' "$MAIN_ID")" = healthy ] ||
  fail "main Redis is not healthy"

MAIN_BINDING=$(docker port "$MAIN_ID" 6379/tcp | head -1)
case "$MAIN_BINDING" in
127.0.0.1:6379) ;;
*) fail "main Redis must be the audited loopback endpoint, got: $MAIN_BINDING" ;;
esac

[ "$(redis_main CONFIG GET appendonly | tail -1)" = yes ] ||
  fail "main Redis AOF must be enabled"
[ "$(redis_main CONFIG GET appendfsync | tail -1)" = everysec ] ||
  fail "main Redis appendfsync must be everysec"
[ "$(redis_main CONFIG GET maxmemory-policy | tail -1)" = noeviction ] ||
  fail "main Redis must use noeviction"
[ "$(redis_main CONFIG GET dir | tail -1)" = /data ] ||
  fail "unexpected main Redis data directory"
[ "$(redis_main CONFIG GET dbfilename | tail -1)" = dump.rdb ] ||
  fail "unexpected main Redis RDB filename"

REDIS_IMAGE=$(docker inspect --format '{{.Config.Image}}' "$MAIN_ID")
BACKUP_DIR=$(mktemp -d /tmp/suar-redis-rdb-restore.XXXXXX)
BACKUP_FILE="$BACKUP_DIR/dump.rdb"
DRILL_KEY="suar:ops:backup-restore-drill:$(openssl rand -hex 12)"
DRILL_VALUE=$(openssl rand -hex 32)

cd "$PROJECT_ROOT"
trap cleanup EXIT
trap 'exit 130' INT TERM

redis_main SET "$DRILL_KEY" "$DRILL_VALUE" EX 300 >/dev/null
DRILL_KEY_CREATED=1
create_fresh_rdb || fail "main Redis did not produce a healthy fresh RDB snapshot"
docker cp "$MAIN_ID:/data/dump.rdb" "$BACKUP_FILE" >/dev/null
[ -s "$BACKUP_FILE" ] || fail "copied RDB snapshot is empty"

RDB_BYTES=$(wc -c <"$BACKUP_FILE" | tr -d ' ')
RDB_SHA256=$(sha256sum "$BACKUP_FILE" | awk '{print $1}')
docker run --rm \
  --network none \
  --mount "type=bind,source=$BACKUP_FILE,target=/data/backup.rdb,readonly" \
  --entrypoint redis-check-rdb \
  "$REDIS_IMAGE" \
  /data/backup.rdb |
  tail -4

docker run -d \
  --rm \
  --name "$RESTORE_CONTAINER" \
  --network none \
  --user "$(id -u):$(id -g)" \
  --mount "type=bind,source=$BACKUP_DIR,target=/data" \
  "$REDIS_IMAGE" \
  redis-server \
  --appendonly no \
  --save "" \
  --protected-mode yes \
  >/dev/null
RESTORE_STARTED=1

attempt=0
while [ "$attempt" -lt 30 ]; do
  if [ "$(docker exec "$RESTORE_CONTAINER" redis-cli --raw PING 2>/dev/null || true)" = PONG ]; then
    break
  fi
  attempt=$((attempt + 1))
  sleep 0.25
done
[ "$attempt" -lt 30 ] || fail "isolated restore Redis did not become ready"

RESTORED_VALUE=$(docker exec "$RESTORE_CONTAINER" redis-cli --raw GET "$DRILL_KEY")
[ "$RESTORED_VALUE" = "$DRILL_VALUE" ] ||
  fail "isolated restore did not reproduce the drill sentinel"
[ "$(docker exec "$RESTORE_CONTAINER" redis-cli --raw DBSIZE)" -ge 1 ] ||
  fail "isolated restore contains no keys"

remove_drill_key_and_snapshot ||
  fail "failed to remove the drill key and refresh the live RDB snapshot"

echo "[redis-backup-restore][OK] checksum, isolated boot, sentinel restore, and live cleanup passed"
echo "[redis-backup-restore] snapshot_bytes=$RDB_BYTES sha256=$RDB_SHA256"
