import { randomUUID } from 'node:crypto'

import logger from '@adonisjs/core/services/logger'
import Redis from '@adonisjs/redis/services/main'

import { decodeCacheValue, encodeCacheValue } from './cache_codec.js'
import {
  CACHE_PROMETHEUS_CONTENT_TYPE,
  renderCachePrometheusMetrics,
} from './cache_prometheus_metrics.js'
import { cacheRuntimeMetrics } from './cache_runtime_metrics.js'
import inProcessSingleFlightExecutor from './in_process_single_flight_executor.js'

import {
  type CacheDependencyLogChannel,
  CacheDependencyLogGate,
  resolveCacheDependencyLogIntervalMs,
} from '#modules/cache/domain/cache_dependency_log_policy'
import { resolveCacheGenerationControlTtlSeconds } from '#modules/cache/domain/cache_generation_control_policy'
import {
  buildGenerationScopedCacheKey,
  cacheGenerationControlKey,
  cacheGenerationNamespaceForPattern,
} from '#modules/cache/domain/cache_generation_policy'
import {
  type CacheSingleFlightPolicy,
  resolveCacheSingleFlightPolicy,
} from '#modules/cache/domain/cache_single_flight_policy'
import { cacheTtlWithDeterministicJitter } from '#modules/cache/domain/cache_ttl_policy'
import {
  type CacheRememberOptions,
  safeCacheLogContext as cacheIdentifierLogContext,
  CACHE_MAX_KEY_BYTES,
  CACHE_MAX_TTL_SECONDS,
  CACHE_MAX_VALUE_BYTES,
  CACHE_REDIS_KEY_PREFIX,
} from '#modules/cache/public_contracts/cache_contract'
import { serializeObservabilityError } from '#modules/errors/public_contracts/observability_error'

/**
 * RedisCacheStore
 *
 * Centralized Redis cache management using the dedicated `cache` connection.
 * Production policy requires this connection to use a separate physical Redis
 * endpoint from sessions/tokens/limiter state. Separating cache allows:
 *   - FLUSHDB on cache without losing sessions/locks
 *   - Independent eviction policies
 *   - Clear monitoring boundaries
 *
 * Features:
 *   - Type-safe get/set with JSON serialization
 *   - Single Flight Pattern (prevents thundering herd / cache stampede)
 *   - Pattern-based invalidation (e.g., delete all keys for an entity)
 *   - TTL configuration with sensible defaults
 *   - Structured logging instead of console.error
 */

/** Default TTL for cache entries: 5 minutes */
const DEFAULT_TTL = 300

/** Prefix for cache keys (applied at Redis level via keyPrefix config) */
const PREFIX = 'app'
function usesMemoryCache(): boolean {
  return process.env['NODE_ENV'] === 'test' && process.env['CACHE_INTEGRATION_DRIVER'] !== 'redis'
}
const CACHE_SCAN_COUNT = 250
const REDIS_GLOB_META_PATTERN = /[*?[\]]/
const INITIAL_CACHE_CONNECTION_WAIT_MS = 250
const CACHE_SUBSCRIPTION_ACK_TIMEOUT_MS = 1_000
const CACHE_SUBSCRIPTION_MAX_ATTEMPTS = 3
const CACHE_SUBSCRIPTION_RETRY_BASE_MS = 100
const CACHE_DEPENDENCY_LOG_GATE = new CacheDependencyLogGate(
  resolveCacheDependencyLogIntervalMs(process.env['CACHE_DEPENDENCY_FAILURE_LOG_INTERVAL_MS'])
)
const CACHE_GENERATION_CONTROL_TTL_SECONDS = resolveCacheGenerationControlTtlSeconds(
  process.env['CACHE_GENERATION_CONTROL_TTL_SECONDS']
)
const RELEASE_LOCK_SCRIPT = `
if redis.call('GET', KEYS[1]) == ARGV[1] then
  return redis.call('DEL', KEYS[1])
end
return 0
`
const EXTEND_LOCK_SCRIPT = `
if redis.call('GET', KEYS[1]) == ARGV[1] then
  return redis.call('PEXPIRE', KEYS[1], ARGV[2])
end
return 0
`
const RESOLVE_GENERATIONS_SCRIPT = `
local generations = {}
local ttl_seconds = tonumber(ARGV[#KEYS + 1])
if not ttl_seconds or ttl_seconds <= 0 then
  return redis.error_reply('generation control TTL must be positive')
end
local refresh_below_seconds = math.floor(ttl_seconds / 2)
for index, key in ipairs(KEYS) do
  local current = redis.call('GET', key)
  if not current then
    current = ARGV[index]
    redis.call('SET', key, current, 'EX', ttl_seconds)
  else
    local remaining_seconds = redis.call('TTL', key)
    if remaining_seconds == -1 or remaining_seconds < refresh_below_seconds or remaining_seconds > ttl_seconds then
      redis.call('EXPIRE', key, ttl_seconds)
    end
  end
  generations[index] = current
end
return generations
`

interface MemoryCacheEntry {
  value: string
  expiresAt: number
}

const memoryCache = new Map<string, MemoryCacheEntry>()
const memoryCacheGenerations = new Map<string, string>()
let initialCacheConnectionWait: Promise<void> | null = null

function logCacheDependencyFailure(
  channel: CacheDependencyLogChannel,
  error: unknown,
  message: string,
  identifier?: string,
  severity: 'error' | 'warn' = 'warn'
): void {
  const decision = CACHE_DEPENDENCY_LOG_GATE.recordFailure(channel)
  cacheRuntimeMetrics.recordDependencyLog(channel, decision.emit ? 'emitted' : 'suppressed')
  if (!decision.emit) {
    return
  }

  const context = {
    err: serializeObservabilityError(error),
    cacheDependencyChannel: channel,
    suppressedFailures: decision.suppressedFailures,
    ...(identifier ? cacheIdentifierLogContext(identifier) : {}),
  }
  if (severity === 'error') {
    logger.error(context, message)
  } else {
    logger.warn(context, message)
  }
}

function recordCacheDependencySuccess(channel: CacheDependencyLogChannel): void {
  const recovery = CACHE_DEPENDENCY_LOG_GATE.recordSuccess(channel)
  if (!recovery) {
    return
  }

  cacheRuntimeMetrics.recordDependencyLog(channel, 'recovered')
  logger.info(
    {
      cacheDependencyChannel: channel,
      outageDurationMs: recovery.outageDurationMs,
      totalFailures: recovery.totalFailures,
      suppressedFailures: recovery.suppressedFailures,
    },
    'Cache Redis dependency channel recovered'
  )
}

/**
 * Get the dedicated cache Redis connection.
 */
function redis() {
  return Redis.connection('cache')
}

/**
 * Get the cache Redis connection reserved for Pub/Sub.
 *
 * Command and health-check traffic must stay on the regular cache connection.
 */
function redisSubscriber() {
  return Redis.connection('cacheSubscriber')
}

/**
 * With the offline queue disabled, ioredis rejects commands issued during its
 * first healthy handshake. Share one short initial wait across callers so a
 * healthy cache is usable on the first request. Reconnecting clients never wait
 * here: outage paths must fail fast and fall back to the source of truth.
 */
async function redisForCommand() {
  const connection = redis()
  // Materialize the lazy Adonis connection before inspecting its state.
  // The wrapper may still report "wait" until ioConnection is first accessed;
  // returning it at that point races the initial ioredis handshake because the
  // cache connection deliberately disables its offline queue.
  const ioConnection = connection.ioConnection
  if (ioConnection.status === 'ready') {
    return connection
  }
  if (initialCacheConnectionWait) {
    await initialCacheConnectionWait
    return connection
  }
  if (!['connect', 'wait', 'connecting'].includes(ioConnection.status)) {
    return connection
  }

  const connectionWait = new Promise<void>((resolve, reject) => {
    let settled = false
    const finish = (error?: Error) => {
      if (settled) {
        return
      }
      settled = true
      clearTimeout(timeout)
      ioConnection.off('ready', onReady)
      ioConnection.off('error', onError)
      if (error) {
        reject(error)
      } else {
        resolve()
      }
    }
    const onReady = () => finish()
    const onError = (error: Error) => finish(error)
    const timeout = setTimeout(
      () =>
        finish(
          new Error(`Cache Redis did not become ready within ${INITIAL_CACHE_CONNECTION_WAIT_MS}ms`)
        ),
      INITIAL_CACHE_CONNECTION_WAIT_MS
    )

    ioConnection.once('ready', onReady)
    ioConnection.once('error', onError)
    if (ioConnection.status === 'ready') {
      finish()
    }
  })
  initialCacheConnectionWait = connectionWait

  try {
    await connectionWait
  } finally {
    if (initialCacheConnectionWait === connectionWait) {
      initialCacheConnectionWait = null
    }
  }

  return connection
}

function prefixScanPattern(pattern: string): string {
  return `${CACHE_REDIS_KEY_PREFIX}${pattern}`
}

function stripRedisKeyPrefix(key: string): string {
  if (key.startsWith(CACHE_REDIS_KEY_PREFIX)) {
    return key.slice(CACHE_REDIS_KEY_PREFIX.length)
  }

  return key
}

function compileGlobPattern(pattern: string): RegExp {
  return new RegExp(
    `^${pattern
      .split('*')
      .map((segment) => segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('.*')}$`
  )
}

function now(): number {
  return Date.now()
}

function assertValidKey(key: string): void {
  if (key.length === 0 || key.includes('\0')) {
    throw new TypeError('Cache key must be non-empty and cannot contain null bytes')
  }
  if (Buffer.byteLength(key, 'utf8') > CACHE_MAX_KEY_BYTES) {
    throw new RangeError(`Cache key cannot exceed ${CACHE_MAX_KEY_BYTES} UTF-8 bytes`)
  }
}

function assertValidTtl(ttl: number): void {
  if (!Number.isSafeInteger(ttl) || ttl <= 0 || ttl > CACHE_MAX_TTL_SECONDS) {
    throw new RangeError(
      `Cache TTL must be a positive integer no greater than ${CACHE_MAX_TTL_SECONDS} seconds`
    )
  }
}

function serializedValueBytes(serialized: string): number {
  return Buffer.byteLength(serialized, 'utf8')
}

function assertValidValueSize(serialized: string): void {
  const bytes = serializedValueBytes(serialized)
  if (bytes > CACHE_MAX_VALUE_BYTES) {
    throw new RangeError(
      `Serialized cache value cannot exceed ${CACHE_MAX_VALUE_BYTES} UTF-8 bytes`
    )
  }
}

function readMemoryEntry(key: string): MemoryCacheEntry | null {
  const entry = memoryCache.get(key)
  if (!entry) {
    return null
  }

  if (entry.expiresAt <= now()) {
    memoryCache.delete(key)
    return null
  }

  return entry
}

// ─── Cache Key Builders ───────────────────────────────────────

/**
 * Build a namespaced cache key.
 * Example: buildKey('user', 123, 'profile') → 'app:user:123:profile'
 */
function buildKey(...segments: (string | number)[]): string {
  return `${PREFIX}:${segments.join(':')}`
}

// ─── Core Operations ──────────────────────────────────────────

/**
 * Store a value in cache with TTL.
 *
 * Serializes non-string values to JSON.
 * @param key - Cache key
 * @param value - Value to store (will be JSON.stringify'd if not a string)
 * @param ttl - Time to live in seconds (default: 300s = 5 min)
 */
async function writeSerializedValue(key: string, serialized: string, ttl: number): Promise<void> {
  const effectiveTtl = cacheTtlWithDeterministicJitter(key, ttl)
  if (usesMemoryCache()) {
    memoryCache.set(key, {
      value: serialized,
      expiresAt: now() + effectiveTtl * 1000,
    })
    return
  }
  const connection = await redisForCommand()
  await connection.setex(key, effectiveTtl, serialized)
  recordCacheDependencySuccess('write')
}

async function set(key: string, value: unknown, ttl: number = DEFAULT_TTL): Promise<void> {
  assertValidKey(key)
  assertValidTtl(ttl)
  const serialized = encodeCacheValue(value)
  assertValidValueSize(serialized)
  const startedAt = performance.now()

  try {
    await writeSerializedValue(key, serialized, ttl)
    cacheRuntimeMetrics.recordWrite('strict', true)
    cacheRuntimeMetrics.recordOperation('write', performance.now() - startedAt)
  } catch (error) {
    cacheRuntimeMetrics.recordWrite('strict', false)
    cacheRuntimeMetrics.recordOperation('write', performance.now() - startedAt, true)
    logger.error(
      { err: serializeObservabilityError(error), ...cacheIdentifierLogContext(key) },
      'RedisCacheStore.set failed'
    )
    throw error
  }
}

/**
 * Populate an optional read cache without making the underlying read fail when
 * Redis is unavailable. Contract/serialization errors are still surfaced.
 */
async function setBestEffort(
  key: string,
  value: unknown,
  ttl: number = DEFAULT_TTL
): Promise<boolean> {
  assertValidKey(key)
  assertValidTtl(ttl)
  const serialized = encodeCacheValue(value)
  const startedAt = performance.now()
  const valueBytes = serializedValueBytes(serialized)
  if (valueBytes > CACHE_MAX_VALUE_BYTES) {
    cacheRuntimeMetrics.recordWrite('best_effort', false)
    cacheRuntimeMetrics.recordOperation('write', performance.now() - startedAt, true)
    logger.warn(
      { valueBytes, maxValueBytes: CACHE_MAX_VALUE_BYTES },
      'RedisCacheStore.setBestEffort skipped oversized cache value'
    )
    return false
  }

  try {
    await writeSerializedValue(key, serialized, ttl)
    cacheRuntimeMetrics.recordWrite('best_effort', true)
    cacheRuntimeMetrics.recordOperation('write', performance.now() - startedAt)
    return true
  } catch (error) {
    cacheRuntimeMetrics.recordWrite('best_effort', false)
    cacheRuntimeMetrics.recordOperation('write', performance.now() - startedAt, true)
    logCacheDependencyFailure(
      'write',
      error,
      'RedisCacheStore.setBestEffort skipped cache write',
      key
    )
    return false
  }
}

/**
 * Retrieve a typed value from cache.
 *
 * Returns null if key doesn't exist or if deserialization fails.
 * Uses type assertion on JSON.parse result — caller is responsible for
 * ensuring the cached data matches the expected type T.
 *
 * @param key - Cache key
 * @param defaultValue - Value to return if key is not found
 * @returns Parsed value of type T, or defaultValue
 */
async function get<T>(key: string, defaultValue: T | null = null): Promise<T | null> {
  const result = await read<T>(key)
  return result.hit ? result.value : defaultValue
}

interface CacheReadResult<T> {
  hit: boolean
  value: T | null
  available: boolean
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

async function read<T>(key: string, recordLookup = true): Promise<CacheReadResult<T>> {
  assertValidKey(key)
  const startedAt = performance.now()
  let value: string | null

  try {
    if (usesMemoryCache()) {
      value = readMemoryEntry(key)?.value ?? null
    } else {
      const connection = await redisForCommand()
      value = await connection.get(key)
      recordCacheDependencySuccess('read')
    }
    if (value === null) {
      if (recordLookup) cacheRuntimeMetrics.recordRead('miss')
      cacheRuntimeMetrics.recordOperation('read', performance.now() - startedAt)
      return { hit: false, value: null, available: true }
    }
  } catch (error) {
    cacheRuntimeMetrics.recordRead('error')
    cacheRuntimeMetrics.recordOperation('read', performance.now() - startedAt, true)
    logCacheDependencyFailure('read', error, 'RedisCacheStore.get failed', key, 'error')
    return { hit: false, value: null, available: false }
  }

  try {
    assertValidValueSize(value)
    const decoded = decodeCacheValue<T>(value)
    if (recordLookup) cacheRuntimeMetrics.recordRead('hit')
    cacheRuntimeMetrics.recordOperation('read', performance.now() - startedAt)
    return { hit: true, value: decoded, available: true }
  } catch (error) {
    cacheRuntimeMetrics.recordRead('error')
    cacheRuntimeMetrics.recordOperation('read', performance.now() - startedAt, true)
    logger.error(
      { err: serializeObservabilityError(error), ...cacheIdentifierLogContext(key) },
      'RedisCacheStore.get rejected corrupt cache value'
    )
    await del(key).catch(() => {
      // del logs its own failure; source-of-truth fallback must remain available.
    })
    return { hit: false, value: null, available: true }
  }
}

const CACHE_REDIS_SCRIPT_MAX_BYTES = 65_536
const CACHE_REDIS_SCRIPT_MAX_KEYS = 16

/**
 * Raw Redis commands for cache-plane projections that need an atomic Lua
 * contract and therefore cannot use the versioned RedisCacheStore value codec.
 * These methods retain the cache connection's bounded first-handshake and
 * fail-fast reconnect semantics.
 */
async function getRawCacheValue(key: string): Promise<string | null> {
  const startedAt = performance.now()
  assertValidKey(key)

  try {
    if (usesMemoryCache()) {
      throw new TypeError('Raw cache Redis commands require the Redis cache driver')
    }
    const connection = await redisForCommand()
    const value = await connection.get(key)
    recordCacheDependencySuccess('read')
    cacheRuntimeMetrics.recordRead(value === null ? 'miss' : 'hit')
    cacheRuntimeMetrics.recordOperation('read', performance.now() - startedAt)
    return value
  } catch (error) {
    cacheRuntimeMetrics.recordRead('error')
    cacheRuntimeMetrics.recordOperation('read', performance.now() - startedAt, true)
    logCacheDependencyFailure('read', error, 'Raw cache Redis read failed', key, 'error')
    throw error
  }
}

async function evalCacheScript(
  script: string,
  numberOfKeys: number,
  ...arguments_: string[]
): Promise<unknown> {
  const startedAt = performance.now()
  if (script.length === 0 || Buffer.byteLength(script, 'utf8') > CACHE_REDIS_SCRIPT_MAX_BYTES) {
    throw new RangeError('Cache Redis script must contain at most 65536 bytes')
  }
  if (
    !Number.isSafeInteger(numberOfKeys) ||
    numberOfKeys < 1 ||
    numberOfKeys > CACHE_REDIS_SCRIPT_MAX_KEYS ||
    arguments_.length < numberOfKeys ||
    arguments_.length > numberOfKeys + 64
  ) {
    throw new RangeError('Cache Redis script must declare 1-16 keys and at most 64 value arguments')
  }
  for (const key of arguments_.slice(0, numberOfKeys)) {
    assertValidKey(key)
  }
  for (const argument of arguments_.slice(numberOfKeys)) {
    assertValidValueSize(argument)
  }

  try {
    if (usesMemoryCache()) {
      throw new TypeError('Raw cache Redis commands require the Redis cache driver')
    }
    const connection = await redisForCommand()
    const result = await connection.eval(script, numberOfKeys, ...arguments_)
    recordCacheDependencySuccess('write')
    cacheRuntimeMetrics.recordWrite('strict', true)
    cacheRuntimeMetrics.recordOperation('write', performance.now() - startedAt)
    return result
  } catch (error) {
    cacheRuntimeMetrics.recordWrite('strict', false)
    cacheRuntimeMetrics.recordOperation('write', performance.now() - startedAt, true)
    logCacheDependencyFailure(
      'write',
      error,
      'Atomic cache Redis script failed',
      arguments_[0],
      'error'
    )
    throw error
  }
}

async function publishCacheMessage(channel: string, message: string): Promise<number> {
  const startedAt = performance.now()
  assertValidKey(channel)
  assertValidValueSize(message)

  try {
    if (usesMemoryCache()) {
      throw new TypeError('Raw cache Redis commands require the Redis cache driver')
    }
    const connection = await redisForCommand()
    const subscribers = await connection.publish(channel, message)
    recordCacheDependencySuccess('write')
    cacheRuntimeMetrics.recordWrite('strict', true)
    cacheRuntimeMetrics.recordOperation('write', performance.now() - startedAt)
    return subscribers
  } catch (error) {
    cacheRuntimeMetrics.recordWrite('strict', false)
    cacheRuntimeMetrics.recordOperation('write', performance.now() - startedAt, true)
    logCacheDependencyFailure('write', error, 'Cache Redis publication failed', channel, 'error')
    throw error
  }
}

async function subscribeToCacheChannelOnce(
  channel: string,
  handler: (message: string) => void
): Promise<void> {
  const connection = redisSubscriber()

  await new Promise<void>((resolve, reject) => {
    let settled = false
    const finish = (error?: Error) => {
      if (settled) {
        return
      }
      settled = true
      clearTimeout(timeout)
      if (error) {
        reject(error)
      } else {
        resolve()
      }
    }
    const timeout = setTimeout(
      () =>
        finish(
          new Error(
            `Cache Redis subscription was not acknowledged within ${CACHE_SUBSCRIPTION_ACK_TIMEOUT_MS}ms`
          )
        ),
      CACHE_SUBSCRIPTION_ACK_TIMEOUT_MS
    )

    connection.subscribe(channel, handler, {
      onSubscription: () => finish(),
      onError: (error: unknown) =>
        finish(error instanceof Error ? error : new Error('Cache Redis subscription failed')),
    })
  })
}

async function subscribeToCacheChannel(
  channel: string,
  handler: (message: string) => void
): Promise<void> {
  assertValidKey(channel)
  if (typeof handler !== 'function') {
    throw new TypeError('Cache Redis subscription requires a message handler')
  }

  try {
    if (usesMemoryCache()) {
      throw new TypeError('Raw cache Redis subscriptions require the Redis cache driver')
    }
    let lastError: unknown
    for (let attempt = 1; attempt <= CACHE_SUBSCRIPTION_MAX_ATTEMPTS; attempt += 1) {
      try {
        await subscribeToCacheChannelOnce(channel, handler)
        recordCacheDependencySuccess('read')
        return
      } catch (error) {
        lastError = error
        if (attempt < CACHE_SUBSCRIPTION_MAX_ATTEMPTS) {
          await delay(CACHE_SUBSCRIPTION_RETRY_BASE_MS * attempt)
        }
      }
    }
    throw lastError instanceof Error ? lastError : new Error('Cache Redis subscription failed')
  } catch (error) {
    logCacheDependencyFailure('read', error, 'Cache Redis subscription failed', channel, 'error')
    throw error
  }
}

/**
 * Check if a key exists in cache.
 */
