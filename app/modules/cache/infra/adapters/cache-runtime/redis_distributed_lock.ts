import { randomUUID } from 'node:crypto'

import { cacheRuntimeMetrics } from './cache_runtime_metrics.js'
import {
  delay,
  logCacheDependencyFailure,
  now,
  recordCacheDependencySuccess,
  redisForCommand,
} from './redis_cache_connection.js'

import type { CacheSingleFlightPolicy } from '#modules/cache/domain/cache-runtime/cache_single_flight_policy'

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

export type DistributedLockResult = 'acquired' | 'contended' | 'unavailable'

export async function acquireDistributedLock(
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

export interface DistributedLockHeartbeat {
  stop(): Promise<void>
}

export function startDistributedLockHeartbeat(
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

export async function releaseDistributedLock(lockKey: string, ownerToken: string): Promise<void> {
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

export type DistributedWaitResult<T> =
  | { outcome: 'value'; value: T | null }
  | { outcome: 'lock_released' | 'unavailable' | 'timeout' }

export interface LockContextReader<T> {
  read(key: string, recordLookup?: boolean): Promise<{ hit: boolean; value: T | null; available: boolean }>
}

export async function waitForDistributedResult<T>(
  key: string,
  lockKey: string,
  waitTimeoutMs: number,
  reader: LockContextReader<T>
): Promise<DistributedWaitResult<T>> {
  const startedAt = performance.now()
  const deadline = now() + waitTimeoutMs
  let pollDelayMs = 40

  while (now() < deadline) {
    const remainingMs = deadline - now()
    await delay(Math.min(remainingMs, pollDelayMs + Math.floor(Math.random() * 20)))
    const cached = await reader.read(key, false)
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
        const finalRead = await reader.read(key, false)
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

export interface DistributedLockOperations<T> {
  read(key: string, recordLookup?: boolean): Promise<{ hit: boolean; value: T | null; available: boolean }>
  computeAndPopulate(key: string, ttl: number, callback: () => Promise<T>): Promise<T>
}

export async function rememberAcrossProcesses<T>(
  key: string,
  ttl: number,
  callback: () => Promise<T>,
  policy: CacheSingleFlightPolicy,
  operations: DistributedLockOperations<T>
): Promise<T> {
  const lockKey = `singleflight:lock:${key}`
  const ownerToken = randomUUID()
  const waitDeadline = now() + policy.waitTimeoutMs

  for (;;) {
    const lockResult = await acquireDistributedLock(lockKey, ownerToken, policy.lockTtlMs)
    if (lockResult === 'unavailable') {
      return operations.computeAndPopulate(key, ttl, callback)
    }

    if (lockResult === 'contended') {
      const remainingWaitMs = waitDeadline - now()
      if (remainingWaitMs <= 0) {
        cacheRuntimeMetrics.recordLockWait('timeout')
        return operations.computeAndPopulate(key, ttl, callback)
      }

      const sharedResult = await waitForDistributedResult<T>(key, lockKey, remainingWaitMs, operations)
      if (sharedResult.outcome === 'value') {
        return sharedResult.value as T
      }
      if (sharedResult.outcome === 'unavailable' || sharedResult.outcome === 'timeout') {
        return operations.computeAndPopulate(key, ttl, callback)
      }
      continue
    }

    const cachedAfterLock = await operations.read(key, false)
    if (cachedAfterLock.hit) {
      await releaseDistributedLock(lockKey, ownerToken)
      return cachedAfterLock.value as T
    }

    const heartbeat = startDistributedLockHeartbeat(lockKey, ownerToken, policy)
    try {
      return await operations.computeAndPopulate(key, ttl, callback)
    } finally {
      await heartbeat.stop()
      await releaseDistributedLock(lockKey, ownerToken)
    }
  }
}
