import { cacheRuntimeMetrics } from './cache_runtime_metrics.js'
import { usesMemoryCache } from './memory_cache_fallback.js'
import {
  assertValidKey,
  assertValidValueSize,
  delay,
  logCacheDependencyFailure,
  recordCacheDependencySuccess,
  redisForCommand,
  redisSubscriber,
} from './redis_cache_connection.js'

const CACHE_SUBSCRIPTION_ACK_TIMEOUT_MS = 1_000
const CACHE_SUBSCRIPTION_MAX_ATTEMPTS = 3
const CACHE_SUBSCRIPTION_RETRY_BASE_MS = 100

export async function publishCacheMessage(channel: string, message: string): Promise<number> {
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

export async function subscribeToCacheChannelOnce(
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

export async function subscribeToCacheChannel(
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
