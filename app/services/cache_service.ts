import Redis from '@adonisjs/redis/services/main'
import SingleFlightService from '#services/single_flight_service'
import logger from '@adonisjs/core/services/logger'

/**
 * CacheService
 *
 * Centralized Redis cache management using a dedicated 'cache' connection (DB 1).
 * Separating cache from the main Redis DB allows:
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

/**
 * Get the dedicated cache Redis connection.
 */
function redis() {
  return Redis.connection('cache')
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
async function set(key: string, value: unknown, ttl: number = DEFAULT_TTL): Promise<void> {
  try {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value)
    await redis().setex(key, ttl, serialized)
  } catch (error) {
    logger.error({ err: error, key }, 'CacheService.set failed')
    throw error
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
  try {
    const value = await redis().get(key)
    if (value === null) return defaultValue
    try {
      // JSON.parse returns `unknown` functionally, we cast to T
      // This is safe because the caller knows what type they stored
      const parsed: T = JSON.parse(value) as T
      return parsed
    } catch {
      // Value was stored as plain string, not JSON
      return value as T
    }
  } catch (error) {
    logger.error({ err: error, key }, 'CacheService.get failed')
    return defaultValue
  }
}

/**
 * Check if a key exists in cache.
 */
async function has(key: string): Promise<boolean> {
  try {
    return (await redis().exists(key)) > 0
  } catch (error) {
    logger.error({ err: error, key }, 'CacheService.has failed')
    return false
  }
}

/**
 * Delete a single key from cache.
 */
async function del(key: string): Promise<void> {
  try {
    await redis().del(key)
  } catch (error) {
    logger.error({ err: error, key }, 'CacheService.del failed')
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
  try {
    const conn = redis()
    let cursor = '0'
    const allKeys: string[] = []

    // Use SCAN to iterate through keys safely
    do {
      const [nextCursor, keys] = await conn.scan(cursor, 'MATCH', pattern, 'COUNT', 100)
      cursor = nextCursor
      if (keys.length > 0) {
        allKeys.push(...keys)
      }
    } while (cursor !== '0')

    // Delete in batches using pipeline for efficiency
    if (allKeys.length > 0) {
      const pipeline = conn.pipeline()
      for (const key of allKeys) {
        pipeline.del(key)
      }
      await pipeline.exec()
    }
  } catch (error) {
    logger.error({ err: error, pattern }, 'CacheService.deleteByPattern failed')
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
 */
function remember<T>(key: string, ttl: number, callback: () => Promise<T>): Promise<T> {
  const singleFlightKey = `singleflight:${key}`

  return SingleFlightService.execute(singleFlightKey, async () => {
    const cachedData = await get<T>(key)
    if (cachedData !== null) {
      return cachedData
    }

    const data = await callback()
    await set(key, data, ttl)
    return data
  })
}

// ─── Cache Invalidation Helpers ──────────────────────────────

/**
 * Invalidate all cache entries for a specific entity.
 * Example: invalidateEntity('task', 123) deletes 'task:123:*'
 *
 * NOTE: Matches raw key patterns (no prefix) because queries use
 * generateCacheKey() which doesn't prepend PREFIX.
 */
async function invalidateEntity(entityType: string, entityId: string | number): Promise<void> {
  await deleteByPattern(`${entityType}:${String(entityId)}:*`)
}

/**
 * Invalidate all cache entries for an entity type.
 * Example: invalidateEntityType('organization') deletes 'organization:*'
 * Use sparingly — prefer targeted invalidation.
 */
async function invalidateEntityType(entityType: string): Promise<void> {
  await deleteByPattern(`${entityType}:*`)
}

// ─── Atomic Operations ───────────────────────────────────────

/**
 * Atomically increment a counter.
 */
async function increment(key: string, by: number = 1): Promise<number> {
  try {
    return await redis().incrby(key, by)
  } catch (error) {
    logger.error({ err: error, key }, 'CacheService.increment failed')
    throw error
  }
}

/**
 * Atomically decrement a counter.
 */
async function decrement(key: string, by: number = 1): Promise<number> {
  try {
    return await redis().decrby(key, by)
  } catch (error) {
    logger.error({ err: error, key }, 'CacheService.decrement failed')
    throw error
  }
}

// ─── Flush ───────────────────────────────────────────────────

/**
 * Flush the entire cache DB.
 * Only affects DB 1 (cache connection), NOT the main DB (sessions, locks).
 */
async function flush(): Promise<void> {
  try {
    await redis().flushdb()
  } catch (error) {
    logger.error({ err: error }, 'CacheService.flush failed')
    throw error
  }
}

// ─── Export ──────────────────────────────────────────────────

const CacheService = {
  /** Default TTL in seconds */
  ttl: DEFAULT_TTL,
  /** Key prefix */
  prefix: PREFIX,

  // Key builders
  buildKey,

  // Core operations
  set,
  get,
  has,
  delete: del,
  deleteByPattern,
  remember,

  // Invalidation helpers
  invalidateEntity,
  invalidateEntityType,

  // Atomic operations
  increment,
  decrement,

  // Flush
  flush,
} as const

export default CacheService
