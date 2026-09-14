import Redis from '@adonisjs/redis/services/main'
import { test } from '@japa/runner'

import {
  createNamespace,
  RUN_REAL_REDIS,
  SKIP_REASON,
  waitForRedisLock,
} from './support/cache_service_redis_fixtures.js'

import { cacheRuntimeMetrics } from '#modules/cache/infra/adapters/cache-runtime/cache_runtime_metrics'
import InProcessSingleFlightExecutor from '#modules/cache/infra/adapters/cache-runtime/in_process_single_flight_executor'
import RedisCacheStore from '#modules/cache/infra/adapters/cache-runtime/redis_cache_store'


test('RedisCacheStore | Redis coalesces work across independent local flight registries', async ({
  assert,
  cleanup,
}) => {
  cacheRuntimeMetrics.resetForTests()
  const namespace = createNamespace()
  cleanup(() => RedisCacheStore.deleteByPattern(`${namespace}:*`))
  const key = `${namespace}:distributed-flight`
  const lockKey = `singleflight:lock:${key}`
  const connection = Redis.connection('cache')
  let executions = 0
  let releaseLeader: (() => void) | undefined
  const leaderMayFinish = new Promise<void>((resolve) => {
    releaseLeader = resolve
  })

  const first = RedisCacheStore.remember(key, 60, async () => {
    executions++
    await leaderMayFinish
    return { source: 'leader' }
  })
  await waitForRedisLock(connection, lockKey)

  // Simulate another process: it does not share this process-local registry.
  InProcessSingleFlightExecutor.clear()
  const second = RedisCacheStore.remember(key, 60, () => {
    executions++
    return Promise.resolve({ source: 'duplicate' })
  })
  await new Promise((resolve) => setTimeout(resolve, 80))
  releaseLeader?.()

  const [firstResult, secondResult] = await Promise.all([first, second])
  assert.equal(executions, 1)
  assert.deepEqual(firstResult, { source: 'leader' })
  assert.deepEqual(secondResult, { source: 'leader' })
  const metrics = RedisCacheStore.runtimeMetrics()
  assert.equal(metrics.reads.misses, 2)
  assert.equal(metrics.stampedeProtection.lockAcquired, 1)
  assert.equal(metrics.stampedeProtection.lockContended, 1)
  assert.equal(metrics.stampedeProtection.waitSucceeded, 1)
  assert.equal(metrics.stampedeProtection.recomputations, 1)
}).skip(!RUN_REAL_REDIS, SKIP_REASON)

test('RedisCacheStore | Redis keeps a slow fill single-flight across local registries', async ({
  assert,
  cleanup,
}) => {
  cacheRuntimeMetrics.resetForTests()
  const namespace = createNamespace()
  cleanup(() => RedisCacheStore.deleteByPattern(`${namespace}:*`))
  const key = `${namespace}:slow-distributed-flight`
  const lockKey = `singleflight:lock:${key}`
  const connection = Redis.connection('cache')
  let executions = 0

  const first = RedisCacheStore.remember(key, 60, async () => {
    executions++
    await new Promise((resolve) => setTimeout(resolve, 2_300))
    return { source: 'slow-leader' }
  })
  await waitForRedisLock(connection, lockKey)

  // Clear the in-process registry to isolate the Redis coordination path.
  InProcessSingleFlightExecutor.clear()
  const second = RedisCacheStore.remember(key, 60, () => {
    executions++
    return Promise.resolve({ source: 'duplicate' })
  })

  const [firstResult, secondResult] = await Promise.all([first, second])
  assert.equal(executions, 1)
  assert.deepEqual(firstResult, { source: 'slow-leader' })
  assert.deepEqual(secondResult, { source: 'slow-leader' })
  const metrics = RedisCacheStore.runtimeMetrics()
  assert.isAtLeast(metrics.stampedeProtection.leaseExtended, 1)
  assert.equal(metrics.stampedeProtection.waitSucceeded, 1)
  assert.equal(metrics.stampedeProtection.waitTimedOut, 0)
  assert.equal(metrics.stampedeProtection.recomputations, 1)
})
  .timeout(5_000)
  .skip(!RUN_REAL_REDIS, SKIP_REASON)

test('RedisCacheStore | Redis takes over promptly after an abandoned fill lock expires', async ({
  assert,
  cleanup,
}) => {
  cacheRuntimeMetrics.resetForTests()
  const namespace = createNamespace()
  const key = `${namespace}:abandoned-flight`
  const lockKey = `singleflight:lock:${key}`
  const connection = Redis.connection('cache')
  cleanup(async () => {
    await RedisCacheStore.deleteByPattern(`${namespace}:*`)
    await connection.del(lockKey)
  })
  await connection.set(lockKey, 'abandoned-owner', 'PX', 300)

  let executions = 0
  const startedAt = performance.now()
  const result = await RedisCacheStore.remember(
    key,
    60,
    () => {
      executions++
      return Promise.resolve({ source: 'takeover' })
    },
    { waitTimeoutMs: 2_000 }
  )
  const elapsedMs = performance.now() - startedAt

  assert.equal(executions, 1)
  assert.deepEqual(result, { source: 'takeover' })
  assert.isAtLeast(elapsedMs, 250)
  assert.isBelow(elapsedMs, 1_500)
  const metrics = RedisCacheStore.runtimeMetrics()
  assert.isAtLeast(metrics.stampedeProtection.waitLockReleased, 1)
  assert.equal(metrics.stampedeProtection.waitTimedOut, 0)
  assert.equal(metrics.stampedeProtection.recomputations, 1)
})
  .timeout(3_000)
  .skip(!RUN_REAL_REDIS, SKIP_REASON)

test('RedisCacheStore | Redis stale owner cannot release a successor lock', async ({
  assert,
  cleanup,
}) => {
  cacheRuntimeMetrics.resetForTests()
  const namespace = createNamespace()
  const key = `${namespace}:fenced-flight`
  const lockKey = `singleflight:lock:${key}`
  const connection = Redis.connection('cache')
  cleanup(async () => {
    await RedisCacheStore.deleteByPattern(`${namespace}:*`)
    await connection.del(lockKey)
  })

  let releaseLeader: (() => void) | undefined
  let reportLeaderStarted: (() => void) | undefined
  const leaderStarted = new Promise<void>((resolve) => {
    reportLeaderStarted = resolve
  })
  const leaderMayFinish = new Promise<void>((resolve) => {
    releaseLeader = resolve
  })

  const leader = RedisCacheStore.remember(key, 60, async () => {
    reportLeaderStarted?.()
    await leaderMayFinish
    return { source: 'stale-owner-result' }
  })
  await leaderStarted
  await new Promise((resolve) => setTimeout(resolve, 650))
  await connection.set(lockKey, 'successor-owner', 'PX', 5_000)
  await new Promise((resolve) => setTimeout(resolve, 600))
  releaseLeader?.()

  assert.deepEqual(await leader, { source: 'stale-owner-result' })
  assert.equal(await connection.get(lockKey), 'successor-owner')
  const metrics = RedisCacheStore.runtimeMetrics()
  assert.isAtLeast(metrics.stampedeProtection.leaseExtended, 1)
  assert.isAtLeast(metrics.stampedeProtection.leaseLost, 1)
})
  .timeout(4_000)
  .skip(!RUN_REAL_REDIS, SKIP_REASON)

test('RedisCacheStore | Redis makes bounded source fallback observable after waiter timeout', async ({
  assert,
  cleanup,
}) => {
  cacheRuntimeMetrics.resetForTests()
  const namespace = createNamespace()
  cleanup(() => RedisCacheStore.deleteByPattern(`${namespace}:*`))
  const key = `${namespace}:bounded-wait-flight`
  const lockKey = `singleflight:lock:${key}`
  const connection = Redis.connection('cache')
  let executions = 0

  const leader = RedisCacheStore.remember(
    key,
    60,
    async () => {
      executions++
      await new Promise((resolve) => setTimeout(resolve, 700))
      return { source: 'slow-leader' }
    },
    { waitTimeoutMs: 300 }
  )
  await waitForRedisLock(connection, lockKey)
  InProcessSingleFlightExecutor.clear()
  const fallback = RedisCacheStore.remember(
    key,
    60,
    () => {
      executions++
      return Promise.resolve({ source: 'bounded-fallback' })
    },
    { waitTimeoutMs: 300 }
  )

  const [leaderResult, fallbackResult] = await Promise.all([leader, fallback])
  assert.equal(executions, 2)
  assert.deepEqual(leaderResult, { source: 'slow-leader' })
  assert.deepEqual(fallbackResult, { source: 'bounded-fallback' })
  const metrics = RedisCacheStore.runtimeMetrics()
  assert.equal(metrics.stampedeProtection.waitTimedOut, 1)
  assert.equal(metrics.stampedeProtection.recomputations, 2)
})
  .timeout(2_000)
  .skip(!RUN_REAL_REDIS, SKIP_REASON)
