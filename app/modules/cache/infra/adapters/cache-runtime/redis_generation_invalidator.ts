import { randomUUID } from 'node:crypto'

import logger from '@adonisjs/core/services/logger'

import { cacheRuntimeMetrics } from './cache_runtime_metrics.js'
import {
  deleteMemoryEntry,
  getMemoryCacheKeys,
  getMemoryGeneration,
  readMemoryEntry,
  setMemoryGeneration,
  usesMemoryCache,
} from './memory_cache_fallback.js'
import {
  assertValidKey,
  CACHE_SCAN_COUNT,
  compileGlobPattern,
  logCacheDependencyFailure,
  now,
  prefixScanPattern,
  recordCacheDependencySuccess,
  REDIS_GLOB_META_PATTERN,
  redisForCommand,
  stripRedisKeyPrefix,
} from './redis_cache_connection.js'

import { resolveCacheGenerationControlTtlSeconds } from '#modules/cache/domain/cache-runtime/cache_generation_control_policy'
import {
  buildGenerationScopedCacheKey,
  cacheGenerationControlKey,
  cacheGenerationNamespaceForPattern,
} from '#modules/cache/domain/cache-runtime/cache_generation_policy'
import { safeCacheLogContext as cacheIdentifierLogContext } from '#modules/cache/public_contracts/cache_contract'
import { serializeObservabilityError } from '#modules/errors/public_contracts/observability_error'

const CACHE_GENERATION_CONTROL_TTL_SECONDS = resolveCacheGenerationControlTtlSeconds(
  process.env['CACHE_GENERATION_CONTROL_TTL_SECONDS']
)

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

export interface CacheKeyPage {
  keys: string[]
  nextCursor: string
}

export async function del(key: string): Promise<void> {
  const startedAt = performance.now()
  try {
    assertValidKey(key)
    if (usesMemoryCache()) {
      const deleted = deleteMemoryEntry(key)
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

export async function deleteBestEffort(key: string): Promise<boolean> {
  try {
    await del(key)
    return true
  } catch {
    return false
  }
}

export async function resolveVersionedKeyBestEffort(
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
        const token = getMemoryGeneration(generationNamespace) ?? randomUUID()
        setMemoryGeneration(generationNamespace, token)
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

export async function rotateGeneration(namespace: string): Promise<void> {
  const controlKey = cacheGenerationControlKey(namespace)
  const startedAt = performance.now()

  try {
    const nextGeneration = randomUUID()
    if (usesMemoryCache()) {
      setMemoryGeneration(namespace, nextGeneration)
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

export async function deleteByPattern(pattern: string): Promise<void> {
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

      for (const key of getMemoryCacheKeys()) {
        if (regex.test(key)) {
          if (deleteMemoryEntry(key)) {
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

export async function deleteByPatternBestEffort(pattern: string): Promise<boolean> {
  try {
    await deleteByPattern(pattern)
    return true
  } catch {
    return false
  }
}

export async function scanKeys(pattern = '*', cursor = '0', count = 100): Promise<CacheKeyPage> {
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
      const matchingKeys = [...getMemoryCacheKeys()]
        .filter((key) => readMemoryEntry(key, now()) !== null && regex.test(key))
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
