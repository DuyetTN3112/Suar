import logger from '@adonisjs/core/services/logger'
import { test } from '@japa/runner'

import RedisCacheStore from '#modules/cache/infra/adapters/cache-runtime/redis_cache_store'
import { taskListCacheGenerationNamespaces } from '#modules/cache/public_contracts/cache_contract'

const RUN_UNAVAILABLE_CACHE = process.env['CACHE_UNAVAILABLE_INTEGRATION'] === '1'
const SKIP_REASON =
  'Set CACHE_INTEGRATION_DRIVER=redis, CACHE_UNAVAILABLE_INTEGRATION=1, and point REDIS_CACHE_TEST_PORT at an unused local port'

test('RedisCacheStore | unavailable Redis degrades get, population, and remember without blocking', async ({
  assert,
}) => {
  const key = `cache-unavailable:${Date.now()}`
  const startedAt = performance.now()
  const metricsBefore = RedisCacheStore.runtimeMetrics()
  const originalError = logger.error.bind(logger)
  const capturedReadFailures: Array<{ context: unknown; message: unknown }> = []

  logger.error = ((context: unknown, message: unknown) => {
    if (message === 'RedisCacheStore.get failed') {
      capturedReadFailures.push({ context, message })
    }
  }) as typeof logger.error

  let burstResults: Array<unknown>
  try {
    burstResults = await Promise.all(
      Array.from({ length: 50 }, (_, index) => RedisCacheStore.get(`${key}:${index}`))
    )
  } finally {
    logger.error = originalError
  }

  assert.isTrue(burstResults.every((result) => result === null))
  assert.lengthOf(capturedReadFailures, 1, 'the outage burst must emit one physical error log')
  assert.include(
    JSON.stringify(capturedReadFailures[0]?.context),
    '"cacheDependencyChannel":"read"'
  )
  assert.notInclude(JSON.stringify(capturedReadFailures), key)
  const metricsAfterBurst = RedisCacheStore.runtimeMetrics()
  assert.equal(
    metricsAfterBurst.dependencyLogs.read.emitted - metricsBefore.dependencyLogs.read.emitted,
    1,
    'one read-channel failure log should represent the burst'
  )
  assert.equal(
    metricsAfterBurst.dependencyLogs.read.suppressed - metricsBefore.dependencyLogs.read.suppressed,
    49,
    'every repeated read failure must remain counted while its log is suppressed'
  )
  assert.isFalse(await RedisCacheStore.setBestEffort(key, { never: 'written' }, 60))
  assert.isNull(
    await RedisCacheStore.resolveVersionedKeyBestEffort(
      taskListCacheGenerationNamespaces('organization-1'),
      `tasks:list:v2:org:organization-1:scope:all:query:${key}`
    )
  )
  assert.deepEqual(
    await RedisCacheStore.remember(key, 60, () => Promise.resolve({ source: 'database' })),
    { source: 'database' }
  )

  assert.isBelow(
    performance.now() - startedAt,
    1_000,
    'a burst plus best-effort cache fallback must finish within one second when Redis is unavailable'
  )
}).skip(!RUN_UNAVAILABLE_CACHE, SKIP_REASON)
