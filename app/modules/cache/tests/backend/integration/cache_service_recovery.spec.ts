import { randomUUID } from 'node:crypto'
import { existsSync } from 'node:fs'

import { test } from '@japa/runner'

import RedisCacheStore from '#modules/cache/infra/redis_cache_store'

const OUTAGE_GATE = process.env['CACHE_RECOVERY_OUTAGE_GATE']
const RESTORE_GATE = process.env['CACHE_RECOVERY_RESTORE_GATE']
const RUN_CACHE_RECOVERY_FLOW =
  process.env['CACHE_RECOVERY_FLOW'] === '1' && Boolean(OUTAGE_GATE) && Boolean(RESTORE_GATE)
const SKIP_REASON =
  'Set CACHE_INTEGRATION_DRIVER=redis, CACHE_RECOVERY_FLOW=1, and unique outage/restore gate paths'

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

async function waitForCacheWrite(key: string, value: string, timeoutMs: number): Promise<boolean> {
  const deadline = performance.now() + timeoutMs
  do {
    if (await RedisCacheStore.setBestEffort(key, value, 60)) {
      return true
    }
    await delay(100)
  } while (performance.now() < deadline)

  return false
}

async function waitForGate(path: string, timeoutMs: number): Promise<boolean> {
  const deadline = performance.now() + timeoutMs
  do {
    if (existsSync(path)) {
      return true
    }
    await delay(50)
  } while (performance.now() < deadline)

  return false
}

test('RedisCacheStore | same process reconnects after a live cache outage', async ({ assert }) => {
  if (!OUTAGE_GATE || !RESTORE_GATE) {
    throw new Error('Cache recovery gate paths are required')
  }

  const key = `cache-recovery:${randomUUID()}`
  assert.isTrue(await waitForCacheWrite(key, 'before-outage', 5_000))
  process.stdout.write('CACHE_RECOVERY_READY_FOR_OUTAGE\n')

  assert.isTrue(await waitForGate(OUTAGE_GATE, 30_000), 'outage gate was not opened')
  const metricsBeforeOutage = RedisCacheStore.runtimeMetrics()
  const outageReadStartedAt = performance.now()
  assert.isNull(await RedisCacheStore.get(key))
  assert.isBelow(
    performance.now() - outageReadStartedAt,
    500,
    'an established client must fail fast after the cache connection drops'
  )
  const metricsDuringOutage = RedisCacheStore.runtimeMetrics()
  assert.isAbove(
    metricsDuringOutage.dependencyLogs.read.emitted -
      metricsBeforeOutage.dependencyLogs.read.emitted,
    0,
    'the first dependency failure must remain observable'
  )
  process.stdout.write('CACHE_RECOVERY_OUTAGE_OBSERVED\n')

  assert.isTrue(await waitForGate(RESTORE_GATE, 30_000), 'restore gate was not opened')
  assert.isTrue(
    await waitForCacheWrite(key, 'after-recovery', 5_000),
    'the existing cache client must reconnect without an application restart'
  )
  assert.equal(await RedisCacheStore.get(key), 'after-recovery')
  const metricsAfterRecovery = RedisCacheStore.runtimeMetrics()
  assert.isAbove(
    metricsAfterRecovery.dependencyLogs.read.recoveries -
      metricsDuringOutage.dependencyLogs.read.recoveries,
    0,
    'the first successful read after recovery must close the outage log channel'
  )
  await RedisCacheStore.deleteBestEffort(key)
})
  .timeout(70_000)
  .skip(!RUN_CACHE_RECOVERY_FLOW, SKIP_REASON)
