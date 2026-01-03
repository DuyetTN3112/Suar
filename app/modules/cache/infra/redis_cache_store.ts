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
async function has(key: string): Promise<boolean> {
  assertValidKey(key)
  try {
    if (usesMemoryCache()) {
      return readMemoryEntry(key) !== null
    }
    const connection = await redisForCommand()
    return (await connection.exists(key)) > 0
  } catch (error) {
    logger.error(
      { err: serializeObservabilityError(error), ...cacheIdentifierLogContext(key) },
      'RedisCacheStore.has failed'
    )
    throw error
  }
}

/**
 * Delete a single key from cache.
 */
async function del(key: string): Promise<void> {
  const startedAt = performance.now()
  try {
    assertValidKey(key)
    if (usesMemoryCache()) {
      const deleted = memoryCache.delete(key)
      cacheRuntimeMetrics.recordInvalidation('single_key', true, deleted ? 1 : 0)
      cacheRuntimeMetrics.recordOperation('delete', performance.now() - startedAt)
      return
    }
    const connection = await redisForCommand()
    const deleted = await connection.del(key)
    cacheRuntimeMetrics.recordInvalidation('single_key', true, deleted)
    cacheRuntimeMetrics.recordOperation('delete', performance.now() - startedAt)
  } catch (error) {
    cacheRuntimeMetrics.recordInvalidation('single_key', false)
    cacheRuntimeMetrics.recordOperation('delete', performance.now() - startedAt, true)
    logger.error(
      { err: serializeObservabilityError(error), ...cacheIdentifierLogContext(key) },
      'RedisCacheStore.del failed'
    )
    throw error
  }
}

export { del }

/**
 * Resolve one immutable physical key for a logical cache read/fill cycle.
 *
 * A generation rotation makes every previous physical key unreachable without
 * scanning Redis. Old values expire naturally under their original TTL.
 * Redis outages return null so optional cache reads can bypass the cache.
 */
async function resolveVersionedKeyBestEffort(
  namespace: string | readonly string[],
  logicalKey: string
): Promise<string | null> {
  assertValidKey(logicalKey)
  const namespaces = typeof namespace === 'string' ? [namespace] : [...namespace]
  if (namespaces.length === 0 || new Set(namespaces).size !== namespaces.length) {
    throw new TypeError('Cache generation resolution requires unique namespaces')
  }
  const controlKeys = namespaces.map((generationNamespace) =>
    cacheGenerationControlKey(generationNamespace)
  )
  const startedAt = performance.now()
  let generationTokens: string[]

  try {
    if (usesMemoryCache()) {
      generationTokens = namespaces.map((generationNamespace) => {
        const token = memoryCacheGenerations.get(generationNamespace) ?? randomUUID()
        memoryCacheGenerations.set(generationNamespace, token)
        return token
      })
    } else {
      const connection = await redisForCommand()
      const resolved = await connection.eval(
        RESOLVE_GENERATIONS_SCRIPT,
        controlKeys.length,
        ...controlKeys,
        ...controlKeys.map(() => randomUUID()),
        String(CACHE_GENERATION_CONTROL_TTL_SECONDS)
      )
      if (!Array.isArray(resolved) || resolved.length !== controlKeys.length) {
        throw new TypeError('Cache generation resolver returned an invalid token set')
      }
      generationTokens = []
      for (const token of resolved) {
        if (typeof token !== 'string') {
          throw new TypeError('Cache generation resolver returned an invalid token')
        }
        generationTokens.push(token)
      }
      recordCacheDependencySuccess('generation')
    }
    cacheRuntimeMetrics.recordOperation('generation_resolve', performance.now() - startedAt)
  } catch (error) {
    cacheRuntimeMetrics.recordOperation('generation_resolve', performance.now() - startedAt, true)
    logCacheDependencyFailure(
      'generation',
      error,
      'RedisCacheStore generation resolution unavailable',
      namespaces.join('|')
    )
    return null
  }

  const versionedKey = buildGenerationScopedCacheKey(logicalKey, generationTokens)
  assertValidKey(versionedKey)
  return versionedKey
}

async function rotateGeneration(namespace: string): Promise<void> {
  const controlKey = cacheGenerationControlKey(namespace)
  const startedAt = performance.now()

  try {
    const nextGeneration = randomUUID()
    if (usesMemoryCache()) {
      memoryCacheGenerations.set(namespace, nextGeneration)
    } else {
      const connection = await redisForCommand()
      await connection.set(controlKey, nextGeneration, 'EX', CACHE_GENERATION_CONTROL_TTL_SECONDS)
      recordCacheDependencySuccess('generation')
    }
    cacheRuntimeMetrics.recordInvalidation('generation', true)
    cacheRuntimeMetrics.recordOperation('generation_rotate', performance.now() - startedAt)
  } catch (error) {
    cacheRuntimeMetrics.recordInvalidation('generation', false)
    cacheRuntimeMetrics.recordOperation('generation_rotate', performance.now() - startedAt, true)
    logCacheDependencyFailure(
      'generation',
      error,
      'RedisCacheStore generation rotation failed',
      namespace,
      'error'
    )
    throw error
  }
}

/**
 * Delete all keys matching a glob pattern.
 *
 * Uses SCAN instead of KEYS to avoid blocking Redis on large datasets.
 * KEYS is O(N) and blocks the entire server — SCAN is cursor-based and safe.
 *
 * @param pattern - Glob pattern (e.g., 'app:user:123:*')
 */
async function deleteByPattern(pattern: string): Promise<void> {
  const startedAt = performance.now()
  let deletedKeys = 0
  let delegatedGeneration: string | null = null
  try {
    assertValidKey(pattern)
    delegatedGeneration = cacheGenerationNamespaceForPattern(pattern)
    if (delegatedGeneration) {
      await rotateGeneration(delegatedGeneration)
      return
    }

    if (!REDIS_GLOB_META_PATTERN.test(pattern)) {
      await del(pattern)
      return
    }

    if (usesMemoryCache()) {
      const regex = compileGlobPattern(pattern)

      for (const key of memoryCache.keys()) {
        if (regex.test(key)) {
          if (memoryCache.delete(key)) {
            deletedKeys += 1
          }
        }
      }
      cacheRuntimeMetrics.recordInvalidation('pattern', true, deletedKeys)
      cacheRuntimeMetrics.recordOperation('pattern_delete', performance.now() - startedAt)
      return
    }

    const conn = await redisForCommand()
    const scanPattern = prefixScanPattern(pattern)
    let cursor = '0'

    // Keep memory bounded by deleting each SCAN page before fetching the next.
    do {
      const [nextCursor, keys] = await conn.scan(
        cursor,
        'MATCH',
        scanPattern,
        'COUNT',
        CACHE_SCAN_COUNT
      )
      cursor = nextCursor
      if (keys.length > 0) {
        deletedKeys += keys.length
        const pipeline = conn.pipeline()
        for (const key of keys) {
          pipeline.unlink(stripRedisKeyPrefix(key))
        }
        const results = await pipeline.exec()
        const failedCommand = results?.find(([commandError]) => commandError !== null)
        if (failedCommand?.[0]) {
          throw failedCommand[0]
        }
      }
    } while (cursor !== '0')
    cacheRuntimeMetrics.recordInvalidation('pattern', true, deletedKeys)
    cacheRuntimeMetrics.recordOperation('pattern_delete', performance.now() - startedAt)
  } catch (error) {
    if (!delegatedGeneration) {
      cacheRuntimeMetrics.recordInvalidation('pattern', false, deletedKeys)
      cacheRuntimeMetrics.recordOperation('pattern_delete', performance.now() - startedAt, true)
      logger.error(
        { err: serializeObservabilityError(error), ...cacheIdentifierLogContext(pattern) },
        'RedisCacheStore.deleteByPattern failed'
      )
    }
    throw error
  }
}

/**
 * Low-latency invalidation used by post-commit request paths.
 *
 * The durable PostgreSQL outbox is the correctness guarantee. This helper
 * deliberately absorbs Redis failures so a committed business mutation is not
 * reported to the user as failed. Outbox workers must keep using the strict
 * deleteByPattern method so failed delivery is retried instead of ACKed.
 */
async function deleteByPatternBestEffort(pattern: string): Promise<boolean> {
  try {
    await deleteByPattern(pattern)
    return true
  } catch {
    return false
  }
}

async function deleteBestEffort(key: string): Promise<boolean> {
  try {
    await del(key)
    return true
  } catch {
    return false
  }
}

interface CacheKeyPage {
  keys: string[]
  nextCursor: string
}

/**
 * Lists one bounded SCAN page from the cache connection only.
 */
async function scanKeys(pattern = '*', cursor = '0', count = 100): Promise<CacheKeyPage> {
  const startedAt = performance.now()
  try {
    assertValidKey(pattern)
    if (!/^\d+$/.test(cursor)) {
      throw new TypeError('Cache scan cursor must be a non-negative integer string')
    }
    if (!Number.isSafeInteger(count) || count < 1 || count > 500) {
      throw new RangeError('Cache scan count must be an integer between 1 and 500')
    }

    if (usesMemoryCache()) {
      const offset = Number(cursor)
      const regex = compileGlobPattern(pattern)
      const matchingKeys = [...memoryCache.keys()]
        .filter((key) => readMemoryEntry(key) !== null && regex.test(key))
        .sort()
      const keys = matchingKeys.slice(offset, offset + count)
      const nextOffset = offset + keys.length
      cacheRuntimeMetrics.recordOperation('scan', performance.now() - startedAt)
      return {
        keys,
        nextCursor: nextOffset >= matchingKeys.length ? '0' : String(nextOffset),
      }
    }

    const connection = await redisForCommand()
    const [nextCursor, keys] = await connection.scan(
      cursor,
      'MATCH',
      prefixScanPattern(pattern),
      'COUNT',
      count
    )
    cacheRuntimeMetrics.recordOperation('scan', performance.now() - startedAt)
    return {
      keys: keys.map(stripRedisKeyPrefix),
      nextCursor,
    }
  } catch (error) {
    cacheRuntimeMetrics.recordOperation('scan', performance.now() - startedAt, true)
    throw error
  }
}

/**
 * Get or compute a cached value with Single Flight Pattern.
 *
 * If the key exists in cache, returns it immediately.
 * If not, executes the callback to compute the value, stores it, and returns it.
 * If multiple concurrent requests ask for the same key, only one callback executes —
 * the rest wait and share the result (prevents thundering herd).
 *
 * @param key - Cache key
 * @param ttl - TTL for the cached value in seconds
 * @param callback - Async function to compute the value if not cached
 * @param options - Optional bounded cross-process waiter policy
 */
function remember<T>(
  key: string,
  ttl: number,
  callback: () => Promise<T>,
  options: CacheRememberOptions = {}
): Promise<T> {
  assertValidKey(key)
  assertValidTtl(ttl)
  const singleFlightPolicy = resolveCacheSingleFlightPolicy(options)
  const singleFlightKey = `singleflight:${key}`

  return inProcessSingleFlightExecutor.execute(singleFlightKey, async () => {
    const cached = await read<T>(key)
    if (cached.hit) {
      return cached.value as T
    }

    if (usesMemoryCache()) {
      return computeAndPopulate(key, ttl, callback)
    }

    return rememberAcrossProcesses(key, ttl, callback, singleFlightPolicy)
  })
}

async function computeAndPopulate<T>(
  key: string,
  ttl: number,
  callback: () => Promise<T>
): Promise<T> {
  const startedAt = performance.now()
  cacheRuntimeMetrics.recordRecomputation()
  try {
    const data = await callback()
    await setBestEffort(key, data, ttl)
    cacheRuntimeMetrics.recordOperation('recompute', performance.now() - startedAt)
    return data
  } catch (error) {
    cacheRuntimeMetrics.recordOperation('recompute', performance.now() - startedAt, true)
    throw error
  }
}

type DistributedLockResult = 'acquired' | 'contended' | 'unavailable'

async function acquireDistributedLock(
  lockKey: string,
  ownerToken: string,
  lockTtlMs: number
): Promise<DistributedLockResult> {
  try {
    const connection = await redisForCommand()
    const outcome =
      (await connection.set(lockKey, ownerToken, 'PX', lockTtlMs, 'NX')) === 'OK'
        ? 'acquired'
        : 'contended'
    recordCacheDependencySuccess('lock')
    cacheRuntimeMetrics.recordDistributedLock(outcome)
    return outcome
  } catch (error) {
    cacheRuntimeMetrics.recordDistributedLock('unavailable')
    logCacheDependencyFailure(
      'lock',
      error,
      'RedisCacheStore distributed lock unavailable',
      lockKey
    )
    return 'unavailable'
  }
}

interface DistributedLockHeartbeat {
  stop(): Promise<void>
}

function startDistributedLockHeartbeat(
  lockKey: string,
  ownerToken: string,
  policy: CacheSingleFlightPolicy
): DistributedLockHeartbeat {
  const startedAt = now()
  let stopped = false
  let timer: ReturnType<typeof setInterval> | null = null
  let extensionInFlight: Promise<void> | null = null

  const stopSchedule = () => {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
  }

  const extendLease = async () => {
    if (stopped) {
      return
    }
    if (now() - startedAt >= policy.maxLeaseLifetimeMs) {
      cacheRuntimeMetrics.recordLockLease('capped')
      stopSchedule()
      return
    }

    try {
      const connection = await redisForCommand()
      const extended = Number(
        await connection.eval(EXTEND_LOCK_SCRIPT, 1, lockKey, ownerToken, String(policy.lockTtlMs))
      )
      recordCacheDependencySuccess('lease')
      if (extended === 1) {
        cacheRuntimeMetrics.recordLockLease('extended')
        return
      }

      cacheRuntimeMetrics.recordLockLease('lost')
      stopSchedule()
    } catch (error) {
      cacheRuntimeMetrics.recordLockLease('error')
      stopSchedule()
      logCacheDependencyFailure(
        'lease',
        error,
        'RedisCacheStore distributed lock heartbeat failed',
        lockKey
      )
    }
  }

  timer = setInterval(() => {
    if (extensionInFlight) {
      return
    }
    extensionInFlight = extendLease().finally(() => {
      extensionInFlight = null
    })
  }, policy.heartbeatIntervalMs)
  timer.unref()

  return {
    async stop() {
      stopped = true
      stopSchedule()
      await extensionInFlight
    },
  }
}

async function releaseDistributedLock(lockKey: string, ownerToken: string): Promise<void> {
  try {
    const connection = await redisForCommand()
    await connection.eval(RELEASE_LOCK_SCRIPT, 1, lockKey, ownerToken)
    recordCacheDependencySuccess('lease')
  } catch (error) {
    logCacheDependencyFailure(
      'lease',
      error,
      'RedisCacheStore distributed lock release failed',
      lockKey
    )
  }
}

type DistributedWaitResult<T> =
  | { outcome: 'value'; value: T | null }
  | { outcome: 'lock_released' | 'unavailable' | 'timeout' }

async function waitForDistributedResult<T>(
  key: string,
  lockKey: string,
  waitTimeoutMs: number
): Promise<DistributedWaitResult<T>> {
  const startedAt = performance.now()
  const deadline = now() + waitTimeoutMs
  let pollDelayMs = 40

  while (now() < deadline) {
    const remainingMs = deadline - now()
    await delay(Math.min(remainingMs, pollDelayMs + Math.floor(Math.random() * 20)))
    const cached = await read<T>(key, false)
    if (cached.hit) {
      cacheRuntimeMetrics.recordLockWait('success')
      cacheRuntimeMetrics.recordOperation('lock_wait', performance.now() - startedAt)
      return { outcome: 'value', value: cached.value }
    }
    if (!cached.available) {
      cacheRuntimeMetrics.recordLockWait('unavailable')
      cacheRuntimeMetrics.recordOperation('lock_wait', performance.now() - startedAt, true)
      return { outcome: 'unavailable' }
    }

    try {
      const connection = await redisForCommand()
      const lockTtl = await connection.pttl(lockKey)
      recordCacheDependencySuccess('lock')
      if (lockTtl < 0) {
        const finalRead = await read<T>(key, false)
        if (finalRead.hit) {
          cacheRuntimeMetrics.recordLockWait('success')
          cacheRuntimeMetrics.recordOperation('lock_wait', performance.now() - startedAt)
          return { outcome: 'value', value: finalRead.value }
        }
        if (!finalRead.available) {
          cacheRuntimeMetrics.recordLockWait('unavailable')
          cacheRuntimeMetrics.recordOperation('lock_wait', performance.now() - startedAt, true)
          return { outcome: 'unavailable' }
        }

        cacheRuntimeMetrics.recordLockWait('lock_released')
        cacheRuntimeMetrics.recordOperation('lock_wait', performance.now() - startedAt)
        return { outcome: 'lock_released' }
      }
    } catch (error) {
      cacheRuntimeMetrics.recordLockWait('unavailable')
      cacheRuntimeMetrics.recordOperation('lock_wait', performance.now() - startedAt, true)
      logCacheDependencyFailure(
        'lock',
        error,
        'RedisCacheStore distributed lock wait failed',
        lockKey
      )
      return { outcome: 'unavailable' }
    }

    pollDelayMs = Math.min(200, Math.ceil(pollDelayMs * 1.5))
  }

  cacheRuntimeMetrics.recordLockWait('timeout')
  cacheRuntimeMetrics.recordOperation('lock_wait', performance.now() - startedAt)
  return { outcome: 'timeout' }
}

async function rememberAcrossProcesses<T>(
  key: string,
  ttl: number,
  callback: () => Promise<T>,
  policy: CacheSingleFlightPolicy
): Promise<T> {
  const lockKey = `singleflight:lock:${key}`
  const ownerToken = randomUUID()
  const waitDeadline = now() + policy.waitTimeoutMs

  for (;;) {
    const lockResult = await acquireDistributedLock(lockKey, ownerToken, policy.lockTtlMs)
    if (lockResult === 'unavailable') {
      return computeAndPopulate(key, ttl, callback)
    }

    if (lockResult === 'contended') {
      const remainingWaitMs = waitDeadline - now()
      if (remainingWaitMs <= 0) {
        cacheRuntimeMetrics.recordLockWait('timeout')
        return computeAndPopulate(key, ttl, callback)
      }

      const sharedResult = await waitForDistributedResult<T>(key, lockKey, remainingWaitMs)
      if (sharedResult.outcome === 'value') {
        return sharedResult.value as T
      }
      if (sharedResult.outcome === 'unavailable' || sharedResult.outcome === 'timeout') {
        return computeAndPopulate(key, ttl, callback)
      }
      continue
    }

    const cachedAfterLock = await read<T>(key, false)
    if (cachedAfterLock.hit) {
      await releaseDistributedLock(lockKey, ownerToken)
      return cachedAfterLock.value as T
    }

    const heartbeat = startDistributedLockHeartbeat(lockKey, ownerToken, policy)
    try {
      return await computeAndPopulate(key, ttl, callback)
    } finally {
      await heartbeat.stop()
      await releaseDistributedLock(lockKey, ownerToken)
    }
  }
}

// ─── Flush ───────────────────────────────────────────────────

/**
 * Flush the dedicated cache connection.
 * Production endpoint isolation keeps main Redis sessions/tokens/limiter state
 * outside this operation.
 */
async function flush(): Promise<void> {
  const startedAt = performance.now()
  try {
    if (usesMemoryCache()) {
      memoryCache.clear()
      memoryCacheGenerations.clear()
      cacheRuntimeMetrics.recordInvalidation('flush', true)
      cacheRuntimeMetrics.recordOperation('flush', performance.now() - startedAt)
      return
    }
    const connection = await redisForCommand()
    await connection.flushdb()
    cacheRuntimeMetrics.recordInvalidation('flush', true)
    cacheRuntimeMetrics.recordOperation('flush', performance.now() - startedAt)
  } catch (error) {
    cacheRuntimeMetrics.recordInvalidation('flush', false)
    cacheRuntimeMetrics.recordOperation('flush', performance.now() - startedAt, true)
    logger.error({ err: serializeObservabilityError(error) }, 'RedisCacheStore.flush failed')
    throw error
  }
}

// ─── Export ──────────────────────────────────────────────────

const redisCacheStore = {
  /** Default TTL in seconds */
  ttl: DEFAULT_TTL,
  /** Key prefix */
  prefix: PREFIX,

  // Key builders
  buildKey,

  // Core operations
  set,
  setBestEffort,
  get,
  getRawCacheValue,
  evalCacheScript,
  publishCacheMessage,
  subscribeToCacheChannel,
  has,
  delete: del,
  deleteBestEffort,
  deleteByPattern,
  deleteByPatternBestEffort,
  scanKeys,
  remember,
  resolveVersionedKeyBestEffort,
  rotateGeneration,
  runtimeMetrics: () => cacheRuntimeMetrics.snapshot(),
  prometheusMetrics: () => ({
    contentType: CACHE_PROMETHEUS_CONTENT_TYPE,
    body: renderCachePrometheusMetrics(cacheRuntimeMetrics.snapshot()),
  }),

  // Flush
  flush,
} as const

export default redisCacheStore
