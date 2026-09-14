import logger from '@adonisjs/core/services/logger'

import { decodeCacheValue, encodeCacheValue } from './cache_codec.js'
import {
  CACHE_PROMETHEUS_CONTENT_TYPE,
  renderCachePrometheusMetrics,
} from './cache_prometheus_metrics.js'
import { cacheRuntimeMetrics } from './cache_runtime_metrics.js'
import inProcessSingleFlightExecutor from './in_process_single_flight_executor.js'
import {
  clearMemoryCache,
  readMemoryEntry,
  usesMemoryCache,
  writeMemoryEntry,
} from './memory_cache_fallback.js'
import {
  assertValidKey,
  assertValidTtl,
  assertValidValueSize,
  DEFAULT_TTL,
  logCacheDependencyFailure,
  now,
  PREFIX,
  recordCacheDependencySuccess,
  redisForCommand,
  serializedValueBytes,
} from './redis_cache_connection.js'
import { rememberAcrossProcesses } from './redis_distributed_lock.js'
import {
  del,
  deleteBestEffort,
  deleteByPattern,
  deleteByPatternBestEffort,
  resolveVersionedKeyBestEffort,
  rotateGeneration,
  scanKeys,
} from './redis_generation_invalidator.js'
import { publishCacheMessage, subscribeToCacheChannel } from './redis_pubsub.js'

import { resolveCacheSingleFlightPolicy } from '#modules/cache/domain/cache-runtime/cache_single_flight_policy'
import { cacheTtlWithDeterministicJitter } from '#modules/cache/domain/cache-runtime/cache_ttl_policy'
import {
  type CacheRememberOptions,
  safeCacheLogContext as cacheIdentifierLogContext,
  CACHE_MAX_VALUE_BYTES,
} from '#modules/cache/public_contracts/cache_contract'
import { serializeObservabilityError } from '#modules/errors/public_contracts/observability_error'

export { del }

const CACHE_REDIS_SCRIPT_MAX_BYTES = 65_536
const CACHE_REDIS_SCRIPT_MAX_KEYS = 16

export interface CacheReadResult<T> {
  hit: boolean
  value: T | null
  available: boolean
}

function buildKey(...segments: (string | number)[]): string {
  return `${PREFIX}:${segments.join(':')}`
}

async function writeSerializedValue(key: string, serialized: string, ttl: number): Promise<void> {
  const effectiveTtl = cacheTtlWithDeterministicJitter(key, ttl)
  if (usesMemoryCache()) {
    writeMemoryEntry(key, serialized, now() + effectiveTtl * 1000)
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

async function read<T>(key: string, recordLookup = true): Promise<CacheReadResult<T>> {
  assertValidKey(key)
  const startedAt = performance.now()
  let value: string | null

  try {
    if (usesMemoryCache()) {
      value = readMemoryEntry(key, now())?.value ?? null
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

async function get<T>(key: string, defaultValue: T | null = null): Promise<T | null> {
  const result = await read<T>(key)
  return result.hit ? result.value : defaultValue
}

async function has(key: string): Promise<boolean> {
  assertValidKey(key)
  try {
    if (usesMemoryCache()) {
      return readMemoryEntry(key, now()) !== null
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

    return rememberAcrossProcesses(key, ttl, callback, singleFlightPolicy, {
      read,
      computeAndPopulate,
    })
  })
}

async function flush(): Promise<void> {
  const startedAt = performance.now()
  try {
    if (usesMemoryCache()) {
      clearMemoryCache()
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

const redisCacheStore = {
  ttl: DEFAULT_TTL,
  prefix: PREFIX,

  buildKey,
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

  flush,
} as const

export default redisCacheStore
