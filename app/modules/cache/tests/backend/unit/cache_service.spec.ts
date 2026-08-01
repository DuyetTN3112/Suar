import { test } from '@japa/runner'

import { cacheRuntimeMetrics } from '#modules/cache/infra/cache_runtime_metrics'
import RedisCacheStore from '#modules/cache/infra/redis_cache_store'
import {
  CACHE_MAX_VALUE_BYTES,
  taskListCacheGenerationNamespaces,
} from '#modules/cache/public_contracts/cache_contract'

test.group('RedisCacheStore', (group) => {
  group.each.setup(() => cacheRuntimeMetrics.resetForTests())
  group.each.teardown(() => RedisCacheStore.flush())

  test('does not expose raw Redis counters through the envelope cache API', ({ assert }) => {
    assert.notProperty(RedisCacheStore, 'increment')
    assert.notProperty(RedisCacheStore, 'decrement')
  })

  test('preserves string identity through the public cache API', async ({ assert }) => {
    for (const value of ['123', 'true', 'null', '{"kind":"string"}']) {
      const key = `cache-service:string:${value}`
      await RedisCacheStore.set(key, value)
      assert.strictEqual(await RedisCacheStore.get(key), value)
    }
  })

  test('caches null results in remember instead of recomputing them', async ({ assert }) => {
    let executions = 0
    const loadNullableValue = () => {
      executions++
      return Promise.resolve(null)
    }

    assert.isNull(await RedisCacheStore.remember('cache-service:null', 60, loadNullableValue))
    assert.isNull(await RedisCacheStore.remember('cache-service:null', 60, loadNullableValue))
    assert.equal(executions, 1)
    assert.isTrue(await RedisCacheStore.has('cache-service:null'))
  })

  test('rejects invalid TTL values before writing', async ({ assert }) => {
    for (const ttl of [0, -1, 1.5, 86_401, Number.NaN]) {
      await assert.rejects(
        () => RedisCacheStore.set('cache-service:invalid-ttl', 'value', ttl),
        /positive integer no greater/
      )
    }
    assert.isFalse(await RedisCacheStore.has('cache-service:invalid-ttl'))
  })

  test('rejects an invalid distributed waiter budget before computing source data', async ({
    assert,
  }) => {
    let executions = 0

    await assert.rejects(
      () =>
        RedisCacheStore.remember(
          'cache-service:invalid-wait-budget',
          60,
          () => {
            executions++
            return Promise.resolve('must-not-run')
          },
          { waitTimeoutMs: 30_001 }
        ),
      /integer between 100 and 30000/
    )
    assert.equal(executions, 0)
  })

  test('rejects oversized cache keys by UTF-8 byte length', async ({ assert }) => {
    const oversizedKey = `cache-service:${'ừ'.repeat(250)}`

    await assert.rejects(
      () => RedisCacheStore.set(oversizedKey, 'value', 60),
      /cannot exceed 512 UTF-8 bytes/
    )
  })

  test('does not downgrade invalid read keys into cache misses', async ({ assert }) => {
    await assert.rejects(() => RedisCacheStore.get(''), /Cache key must be non-empty/)
    await assert.rejects(() => RedisCacheStore.has(''), /Cache key must be non-empty/)
  })

  test('does not hide contract errors in best-effort writes', async ({ assert }) => {
    await assert.rejects(
      () => RedisCacheStore.setBestEffort('cache-service:invalid', undefined, 60),
      /cannot be undefined/
    )
    await assert.rejects(
      () => RedisCacheStore.setBestEffort('cache-service:invalid', 'value', 0),
      /positive integer no greater/
    )
  })

  test('bounds the advanced raw Redis command surface before driver access', async ({ assert }) => {
    await assert.rejects(
      () => RedisCacheStore.getRawCacheValue('x'.repeat(513)),
      'Cache key cannot exceed 512 UTF-8 bytes'
    )
    await assert.rejects(
      () => RedisCacheStore.evalCacheScript('', 1, 'notifications:test'),
      'Cache Redis script must contain at most 65536 bytes'
    )
    await assert.rejects(
      () => RedisCacheStore.evalCacheScript('return 1', 0),
      'Cache Redis script must declare 1-16 keys and at most 64 value arguments'
    )
    await assert.rejects(
      () => RedisCacheStore.evalCacheScript('return 1', 2, 'notifications:test'),
      'Cache Redis script must declare 1-16 keys and at most 64 value arguments'
    )
    await assert.rejects(
      () =>
        RedisCacheStore.evalCacheScript(
          'return 1',
          1,
          'notifications:test',
          ...Array.from({ length: 65 }, () => 'value')
        ),
      'Cache Redis script must declare 1-16 keys and at most 64 value arguments'
    )
    await assert.rejects(
      () => RedisCacheStore.evalCacheScript('x'.repeat(65_537), 1, 'notifications:test'),
      'Cache Redis script must contain at most 65536 bytes'
    )
    await assert.rejects(
      () =>
        RedisCacheStore.evalCacheScript('return 1', 1, 'notifications:test', 'x'.repeat(1_048_577)),
      'Serialized cache value cannot exceed 1048576 UTF-8 bytes'
    )
    await assert.rejects(
      () => RedisCacheStore.publishCacheMessage('notifications:test', 'x'.repeat(1_048_577)),
      'Serialized cache value cannot exceed 1048576 UTF-8 bytes'
    )
  })

  test('bounds serialized value size and lets best-effort reads degrade to source data', async ({
    assert,
  }) => {
    const oversizedValue = 'x'.repeat(CACHE_MAX_VALUE_BYTES)
    const strictKey = 'cache-service:oversized:strict'
    const optionalKey = 'cache-service:oversized:optional'

    await assert.rejects(
      () => RedisCacheStore.set(strictKey, oversizedValue, 60),
      /Serialized cache value cannot exceed 1048576 UTF-8 bytes/
    )
    assert.isFalse(await RedisCacheStore.setBestEffort(optionalKey, oversizedValue, 60))
    assert.isFalse(await RedisCacheStore.has(strictKey))
    assert.isFalse(await RedisCacheStore.has(optionalKey))
    assert.equal(RedisCacheStore.runtimeMetrics().writes.bestEffortSkipped, 1)
  })

  test('deletes only keys matching a glob pattern', async ({ assert }) => {
    await RedisCacheStore.set('cache-service:user:1:profile', { id: 1 })
    await RedisCacheStore.set('cache-service:user:1:skills', { id: 1 })
    await RedisCacheStore.set('cache-service:user:2:profile', { id: 2 })

    await RedisCacheStore.deleteByPattern('cache-service:user:1:*')

    assert.isFalse(await RedisCacheStore.has('cache-service:user:1:profile'))
    assert.isFalse(await RedisCacheStore.has('cache-service:user:1:skills'))
    assert.isTrue(await RedisCacheStore.has('cache-service:user:2:profile'))
  })

  test('routes an exact invalidation through single-key delete', async ({ assert }) => {
    const key = 'cache-service:exact:invalidation'
    await RedisCacheStore.set(key, { stale: true })

    await RedisCacheStore.deleteByPattern(key)

    assert.isFalse(await RedisCacheStore.has(key))
    const metrics = RedisCacheStore.runtimeMetrics()
    assert.equal(metrics.invalidations.singleKeyOperations, 1)
    assert.equal(metrics.invalidations.patternOperations, 0)
    assert.equal(metrics.operations.delete.count, 1)
    assert.equal(metrics.operations.pattern_delete.count, 0)
  })

  test('rotates task-list generations without scanning or deleting old values', async ({
    assert,
  }) => {
    const logicalKey = 'tasks:list:v2:org:org-1:scope:all:query:digest'
    const firstKey = await RedisCacheStore.resolveVersionedKeyBestEffort(
      taskListCacheGenerationNamespaces('org-1'),
      logicalKey
    )
    if (!firstKey) {
      throw new Error('Expected the in-memory generation key to resolve')
    }
    await RedisCacheStore.set(firstKey, { source: 'old-generation' }, 60)

    await RedisCacheStore.deleteByPattern('tasks:list:*')
    const secondKey = await RedisCacheStore.resolveVersionedKeyBestEffort(
      taskListCacheGenerationNamespaces('org-1'),
      logicalKey
    )

    assert.isNotNull(secondKey)
    assert.notEqual(secondKey, firstKey)
    assert.isNull(await RedisCacheStore.get(secondKey ?? 'unreachable'))
    assert.deepEqual(await RedisCacheStore.get(firstKey), { source: 'old-generation' })
    const metrics = RedisCacheStore.runtimeMetrics()
    assert.equal(metrics.invalidations.generationRotations, 1)
    assert.equal(metrics.invalidations.patternOperations, 0)
    assert.equal(metrics.operations.generation_rotate.count, 1)
  })

  test('rotates only the targeted organization generation', async ({ assert }) => {
    const orgTwoLogicalKey = 'tasks:list:v2:org:org-2:scope:all:query:digest'
    const orgThreeLogicalKey = 'tasks:list:v2:org:org-3:scope:all:query:digest'
    const beforeOrgTwo = await RedisCacheStore.resolveVersionedKeyBestEffort(
      taskListCacheGenerationNamespaces('org-2'),
      orgTwoLogicalKey
    )
    const beforeOrgThree = await RedisCacheStore.resolveVersionedKeyBestEffort(
      taskListCacheGenerationNamespaces('org-3'),
      orgThreeLogicalKey
    )

    await RedisCacheStore.deleteByPattern('tasks:list:v2:org:org-2:*')
    const afterOrgTwo = await RedisCacheStore.resolveVersionedKeyBestEffort(
      taskListCacheGenerationNamespaces('org-2'),
      orgTwoLogicalKey
    )
    const afterOrgThree = await RedisCacheStore.resolveVersionedKeyBestEffort(
      taskListCacheGenerationNamespaces('org-3'),
      orgThreeLogicalKey
    )

    assert.isNotNull(beforeOrgTwo)
    assert.isNotNull(afterOrgTwo)
    assert.notEqual(afterOrgTwo, beforeOrgTwo)
    assert.equal(afterOrgThree, beforeOrgThree)
  })

  test('keeps strict worker invalidation errors while post-commit invalidation is best-effort', async ({
    assert,
  }) => {
    await assert.rejects(() => RedisCacheStore.deleteByPattern(''), /Cache key must be non-empty/)
    assert.isFalse(await RedisCacheStore.deleteByPatternBestEffort(''))
    assert.isFalse(await RedisCacheStore.deleteBestEffort(''))
    assert.equal(RedisCacheStore.runtimeMetrics().invalidations.errors, 3)
  })

  test('lists bounded cache-key pages without exposing another namespace', async ({ assert }) => {
    await Promise.all([
      RedisCacheStore.set('cache-service:scan:1', true),
      RedisCacheStore.set('cache-service:scan:2', true),
      RedisCacheStore.set('cache-service:scan:3', true),
      RedisCacheStore.set('cache-service:other', true),
    ])

    const firstPage = await RedisCacheStore.scanKeys('cache-service:scan:*', '0', 2)
    const secondPage = await RedisCacheStore.scanKeys(
      'cache-service:scan:*',
      firstPage.nextCursor,
      2
    )

    assert.lengthOf(firstPage.keys, 2)
    assert.notEqual(firstPage.nextCursor, '0')
    assert.lengthOf(secondPage.keys, 1)
    assert.equal(secondPage.nextCursor, '0')
    assert.sameMembers(
      [...firstPage.keys, ...secondPage.keys],
      ['cache-service:scan:1', 'cache-service:scan:2', 'cache-service:scan:3']
    )
  })

  test('rejects unbounded or malformed key-scan inputs', async ({ assert }) => {
    await assert.rejects(() => RedisCacheStore.scanKeys('*', 'not-a-cursor', 100), /cursor/)
    await assert.rejects(() => RedisCacheStore.scanKeys('*', '0', 501), /between 1 and 500/)
  })

  test('publishes low-cardinality runtime metrics without cache keys or values', async ({
    assert,
  }) => {
    await RedisCacheStore.set('cache-service:telemetry:secret-user-id', { secret: 'not-exported' })
    assert.deepEqual(await RedisCacheStore.get('cache-service:telemetry:secret-user-id'), {
      secret: 'not-exported',
    })
    assert.isNull(await RedisCacheStore.get('cache-service:telemetry:missing'))
    await RedisCacheStore.delete('cache-service:telemetry:secret-user-id')

    const metrics = RedisCacheStore.runtimeMetrics()
    const serialized = JSON.stringify(metrics)

    assert.equal(metrics.reads.total, 2)
    assert.equal(metrics.reads.hits, 1)
    assert.equal(metrics.reads.misses, 1)
    assert.equal(metrics.reads.hitRate, 0.5)
    assert.equal(metrics.writes.strictSucceeded, 1)
    assert.equal(metrics.invalidations.singleKeyOperations, 1)
    assert.equal(metrics.invalidations.keysUnlinked, 1)
    assert.equal(metrics.operations.read.count, 2)
    assert.notInclude(serialized, 'secret-user-id')
    assert.notInclude(serialized, 'not-exported')
  })
})
