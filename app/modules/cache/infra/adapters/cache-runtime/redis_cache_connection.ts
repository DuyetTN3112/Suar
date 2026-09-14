import logger from '@adonisjs/core/services/logger'
import Redis from '@adonisjs/redis/services/main'

import { cacheRuntimeMetrics } from './cache_runtime_metrics.js'

import {
  type CacheDependencyLogChannel,
  CacheDependencyLogGate,
  resolveCacheDependencyLogIntervalMs,
} from '#modules/cache/domain/cache-runtime/cache_dependency_log_policy'
import {
  safeCacheLogContext as cacheIdentifierLogContext,
  CACHE_MAX_KEY_BYTES,
  CACHE_MAX_TTL_SECONDS,
  CACHE_MAX_VALUE_BYTES,
  CACHE_REDIS_KEY_PREFIX,
} from '#modules/cache/public_contracts/cache_contract'
import { serializeObservabilityError } from '#modules/errors/public_contracts/observability_error'

export const DEFAULT_TTL = 300
export const PREFIX = 'app'
export const CACHE_SCAN_COUNT = 250
export const REDIS_GLOB_META_PATTERN = /[*?[\]]/
export const INITIAL_CACHE_CONNECTION_WAIT_MS = 250

const CACHE_DEPENDENCY_LOG_GATE = new CacheDependencyLogGate(
  resolveCacheDependencyLogIntervalMs(process.env['CACHE_DEPENDENCY_FAILURE_LOG_INTERVAL_MS'])
)

let initialCacheConnectionWait: Promise<void> | null = null

export function now(): number {
  return Date.now()
}

export function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

export function logCacheDependencyFailure(
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

export function recordCacheDependencySuccess(channel: CacheDependencyLogChannel): void {
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

export function redis() {
  return Redis.connection('cache')
}

export function redisSubscriber() {
  return Redis.connection('cacheSubscriber')
}

export async function redisForCommand() {
  const connection = redis()
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

export function prefixScanPattern(pattern: string): string {
  return `${CACHE_REDIS_KEY_PREFIX}${pattern}`
}

export function stripRedisKeyPrefix(key: string): string {
  if (key.startsWith(CACHE_REDIS_KEY_PREFIX)) {
    return key.slice(CACHE_REDIS_KEY_PREFIX.length)
  }

  return key
}

export function compileGlobPattern(pattern: string): RegExp {
  let regexPattern = '^'
  for (const char of pattern) {
    if (char === '*') {
      regexPattern += '.*'
    } else if (char === '?') {
      regexPattern += '.'
    } else if ('.[{\\()+^$|'.includes(char)) {
      regexPattern += `\\${char}`
    } else {
      regexPattern += char
    }
  }
  regexPattern += '$'

  return new RegExp(regexPattern)
}

export function assertValidKey(key: string): void {
  if (key.length === 0) {
    throw new TypeError('Cache key must be non-empty and cannot be empty')
  }
  if (Buffer.byteLength(key, 'utf8') > CACHE_MAX_KEY_BYTES) {
    throw new RangeError(`Cache key cannot exceed ${CACHE_MAX_KEY_BYTES} UTF-8 bytes`)
  }
}

export function assertValidTtl(ttl: number): void {
  if (!Number.isSafeInteger(ttl) || ttl <= 0 || ttl > CACHE_MAX_TTL_SECONDS) {
    throw new RangeError(
      `TTL must be a positive integer no greater than ${CACHE_MAX_TTL_SECONDS} seconds (between 1 and ${CACHE_MAX_TTL_SECONDS})`
    )
  }
}

export function serializedValueBytes(serialized: string): number {
  return Buffer.byteLength(serialized, 'utf8')
}

export function assertValidValueSize(serialized: string): void {
  if (serializedValueBytes(serialized) > CACHE_MAX_VALUE_BYTES) {
    throw new RangeError(
      `Serialized cache value cannot exceed ${CACHE_MAX_VALUE_BYTES} UTF-8 bytes`
    )
  }
}
