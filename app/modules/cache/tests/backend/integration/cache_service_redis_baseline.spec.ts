import { randomUUID } from 'node:crypto'

import Redis from '@adonisjs/redis/services/main'
import { test } from '@japa/runner'

import {
  commandCalls,
  createNamespace,
  RUN_REAL_REDIS,
  SKIP_REASON,
} from './support/cache_service_redis_fixtures.js'

import { cacheTtlWithDeterministicJitter } from '#modules/cache/domain/cache-runtime/cache_ttl_policy'
import { cacheRuntimeMetrics } from '#modules/cache/infra/adapters/cache-runtime/cache_runtime_metrics'
import RedisCacheStore from '#modules/cache/infra/adapters/cache-runtime/redis_cache_store'
import { CACHE_MAX_VALUE_BYTES } from '#modules/cache/public_contracts/cache_contract'


test('RedisCacheStore | Redis acknowledges the first cache-plane subscription', async ({
  assert,
  cleanup,
}) => {
  const channel = createNamespace()
  const message = randomUUID()
  let resolveMessage: ((value: string) => void) | undefined
  const receivedMessage = new Promise<string>((resolve) => {
    resolveMessage = resolve
  })
  cleanup(async () => {
    await Redis.connection('cacheSubscriber').unsubscribe(channel)
  })

  await RedisCacheStore.subscribeToCacheChannel(channel, (received) => resolveMessage?.(received))
  const subscriberCount = await RedisCacheStore.publishCacheMessage(channel, message)
  const received = await Promise.race([
    receivedMessage,
    new Promise<never>((_, reject) => {
      setTimeout(
        () => reject(new Error('Cache Redis subscription did not receive a message')),
        1_000
      )
    }),
  ])

  assert.isAtLeast(subscriberCount, 1)
  assert.equal(received, message)
}).skip(!RUN_REAL_REDIS, SKIP_REASON)

test('RedisCacheStore | Redis preserves codec identity and physical TTL', async ({
  assert,
  cleanup,
}) => {
  const namespace = createNamespace()
  cleanup(() => RedisCacheStore.deleteByPattern(`${namespace}:*`))
  const stringKey = `${namespace}:string`
  const objectKey = `${namespace}:object`

  await RedisCacheStore.set(stringKey, '123', 60)
  await RedisCacheStore.set(objectKey, { enabled: true }, 60)

  assert.strictEqual(await RedisCacheStore.get(stringKey), '123')
  assert.deepEqual(await RedisCacheStore.get(objectKey), { enabled: true })

  const connection = Redis.connection('cache')
  const rawValue = await connection.get(stringKey)
  const ttl = await connection.ttl(stringKey)
  assert.include(rawValue ?? '', '__suar_cache_envelope__')
  assert.isAtLeast(ttl, 1)
  assert.isAtMost(ttl, 60)
}).skip(!RUN_REAL_REDIS, SKIP_REASON)

test('RedisCacheStore | Redis physically spreads TTLs without extending staleness', async ({
  assert,
  cleanup,
}) => {
  const namespace = createNamespace()
  cleanup(() => RedisCacheStore.deleteByPattern(`${namespace}:*`))
  const requestedTtl = 120
  const keys = Array.from({ length: 48 }, (_, index) => `${namespace}:jitter:${index}`)

  await Promise.all(keys.map((key) => RedisCacheStore.set(key, { cached: true }, requestedTtl)))

  const connection = Redis.connection('cache')
  const ttlSamples = await Promise.all(
    keys.map(async (key) => ({
      expectedTtl: cacheTtlWithDeterministicJitter(key, requestedTtl),
      physicalTtl: await connection.pttl(key),
    }))
  )

  for (const { expectedTtl, physicalTtl } of ttlSamples) {
    const expectedTtlMs = expectedTtl * 1000
    assert.isAtMost(physicalTtl, expectedTtlMs)
    assert.isAbove(physicalTtl, expectedTtlMs - 2_000)
    assert.isAtMost(expectedTtl, requestedTtl)
  }
  assert.isAbove(new Set(ttlSamples.map(({ expectedTtl }) => expectedTtl)).size, 5)
}).skip(!RUN_REAL_REDIS, SKIP_REASON)

test('RedisCacheStore | Redis deletes matching keys across multiple SCAN pages', async ({
  assert,
  cleanup,
}) => {
  const namespace = createNamespace()
  cleanup(() => RedisCacheStore.deleteByPattern(`${namespace}:*`))
  const matchingKeys = Array.from({ length: 620 }, (_, index) => `${namespace}:target:${index}`)
  const unrelatedKey = `${namespace}:unrelated`

  for (let index = 0; index < matchingKeys.length; index += 100) {
    await Promise.all(
      matchingKeys
        .slice(index, index + 100)
        .map((key) => RedisCacheStore.set(key, { stale: true }, 60))
    )
  }
  await RedisCacheStore.set(unrelatedKey, { keep: true }, 60)

  let cursor = '0'
  const listedKeys: string[] = []
  do {
    const page = await RedisCacheStore.scanKeys(`${namespace}:target:*`, cursor, 100)
    listedKeys.push(...page.keys)
    cursor = page.nextCursor
  } while (cursor !== '0')
  assert.lengthOf(listedKeys, matchingKeys.length)

  await RedisCacheStore.deleteByPattern(`${namespace}:target:*`)

  const connection = Redis.connection('cache')
  const remainingMatches = await connection.keys(`${namespace}:target:*`)
  assert.lengthOf(remainingMatches, 0)
  assert.deepEqual(await RedisCacheStore.get(unrelatedKey), { keep: true })
}).skip(!RUN_REAL_REDIS, SKIP_REASON)

test('RedisCacheStore | Redis deletes an exact pattern without SCAN', async ({
  assert,
  cleanup,
}) => {
  const key = `${createNamespace()}:exact`
  const connection = Redis.connection('cache')
  cleanup(async () => {
    await RedisCacheStore.deleteBestEffort(key)
  })
  await RedisCacheStore.set(key, { stale: true }, 60)
  const scansBefore = commandCalls(await connection.info('commandstats'), 'scan')

  await RedisCacheStore.deleteByPattern(key)

  const scansAfter = commandCalls(await connection.info('commandstats'), 'scan')
  assert.equal(scansAfter - scansBefore, 0)
  assert.isNull(await RedisCacheStore.get(key))
}).skip(!RUN_REAL_REDIS, SKIP_REASON)

test('RedisCacheStore | Redis expires entries at the configured TTL', async ({
  assert,
  cleanup,
}) => {
  const namespace = createNamespace()
  cleanup(() => RedisCacheStore.deleteByPattern(`${namespace}:*`))
  const key = `${namespace}:expiring`

  await RedisCacheStore.set(key, 'short-lived', 1)
  assert.equal(await RedisCacheStore.get(key), 'short-lived')
  await new Promise((resolve) => setTimeout(resolve, 1100))
  assert.isNull(await RedisCacheStore.get(key))
}).skip(!RUN_REAL_REDIS, SKIP_REASON)

test('RedisCacheStore | Redis never writes an oversized best-effort value', async ({
  assert,
  cleanup,
}) => {
  const namespace = createNamespace()
  cleanup(() => RedisCacheStore.deleteByPattern(`${namespace}:*`))
  const key = `${namespace}:oversized`

  assert.isFalse(await RedisCacheStore.setBestEffort(key, 'x'.repeat(CACHE_MAX_VALUE_BYTES), 60))
  assert.isNull(await Redis.connection('cache').get(key))
}).skip(!RUN_REAL_REDIS, SKIP_REASON)

test('RedisCacheStore | Redis rejects an oversized pre-existing value on read', async ({
  assert,
  cleanup,
}) => {
  cacheRuntimeMetrics.resetForTests()
  const namespace = createNamespace()
  cleanup(() => RedisCacheStore.deleteByPattern(`${namespace}:*`))
  const key = `${namespace}:oversized-existing`

  await Redis.connection('cache').setex(key, 60, 'x'.repeat(CACHE_MAX_VALUE_BYTES + 1))

  assert.isNull(await RedisCacheStore.get(key))
  assert.equal(cacheRuntimeMetrics.snapshot().reads.errors, 1)
}).skip(!RUN_REAL_REDIS, SKIP_REASON)
