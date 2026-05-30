import { randomUUID } from 'node:crypto'

import Redis from '@adonisjs/redis/services/main'
import { test } from '@japa/runner'

import { resolveCacheGenerationControlTtlSeconds } from '#modules/cache/domain/cache-runtime/cache_generation_control_policy'
import {
  cacheGenerationControlKey,
  TASK_LIST_CACHE_GENERATION_NAMESPACE,
} from '#modules/cache/domain/cache-runtime/cache_generation_policy'
import { cacheTtlWithDeterministicJitter } from '#modules/cache/domain/cache-runtime/cache_ttl_policy'
import { cacheRuntimeMetrics } from '#modules/cache/infra/adapters/cache-runtime/cache_runtime_metrics'
import InProcessSingleFlightExecutor from '#modules/cache/infra/adapters/cache-runtime/in_process_single_flight_executor'
import RedisCacheStore from '#modules/cache/infra/adapters/cache-runtime/redis_cache_store'
import {
  CACHE_MAX_VALUE_BYTES,
  CACHE_COLLECTION_GENERATION_NAMESPACES,
  entityCacheGenerationNamespaces,
  globalCacheGenerationNamespaces,
  organizationCacheGenerationNamespaces,
  organizationUserCacheGenerationNamespaces,
  taskListCacheGenerationNamespaces,
} from '#modules/cache/public_contracts/cache_contract'

const RUN_REAL_REDIS = process.env['CACHE_INTEGRATION_DRIVER'] === 'redis'
const SKIP_REASON =
  'Set CACHE_INTEGRATION_DRIVER=redis to run against the configured cache connection'
const EXPECTED_GENERATION_CONTROL_TTL_SECONDS = resolveCacheGenerationControlTtlSeconds(
  process.env['CACHE_GENERATION_CONTROL_TTL_SECONDS']
)

function createNamespace(): string {
  return `cache-real:${randomUUID()}`
}

function commandCalls(commandStats: string, command: string): number {
  const match = commandStats.match(new RegExp(`(?:^|\\r?\\n)cmdstat_${command}:calls=(\\d+)`))
  return Number(match?.[1] ?? 0)
}

async function waitForRedisLock(
  connection: { pttl(key: string): Promise<number> },
  lockKey: string,
  timeoutMs = 1_000
): Promise<void> {
  const deadline = performance.now() + timeoutMs
  do {
    if ((await connection.pttl(lockKey)) > 0) {
      return
    }
    await new Promise((resolve) => setTimeout(resolve, 10))
  } while (performance.now() < deadline)

  throw new Error(`Redis single-flight leader did not acquire its lock within ${timeoutMs}ms`)
}

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

test('RedisCacheStore | Redis rotates task-list generation in O(1) without SCAN', async ({
  assert,
  cleanup,
}) => {
  cacheRuntimeMetrics.resetForTests()
  const namespace = createNamespace()
  const organizationId = randomUUID()
  const logicalKey = `tasks:list:v2:org:${organizationId}:scope:all:query:${namespace}`
  const connection = Redis.connection('cache')
  const generationNamespaces = taskListCacheGenerationNamespaces(organizationId)
  const controlKeys = generationNamespaces.map((generationNamespace) =>
    cacheGenerationControlKey(generationNamespace)
  )
  const [primaryControlKey, ...secondaryControlKeys] = controlKeys
  if (!primaryControlKey) {
    throw new Error('Expected at least one task-list generation namespace')
  }
  const concurrentPhysicalKeys = await Promise.all(
    Array.from({ length: 50 }, () =>
      RedisCacheStore.resolveVersionedKeyBestEffort(generationNamespaces, logicalKey)
    )
  )
  assert.equal(new Set(concurrentPhysicalKeys).size, 1)
  const oldPhysicalKey = concurrentPhysicalKeys[0] ?? null
  assert.isNotNull(oldPhysicalKey)
  if (!oldPhysicalKey) {
    throw new Error('Expected the real Redis generation key to resolve')
  }
  const initialControlTtls = await Promise.all(
    controlKeys.map((controlKey) => connection.ttl(controlKey))
  )
  for (const controlTtl of initialControlTtls) {
    assert.isAbove(controlTtl, EXPECTED_GENERATION_CONTROL_TTL_SECONDS - 3)
    assert.isAtMost(controlTtl, EXPECTED_GENERATION_CONTROL_TTL_SECONDS)
  }

  await Promise.all([
    connection.persist(primaryControlKey),
    ...secondaryControlKeys.map((controlKey) => connection.expire(controlKey, 1)),
  ])
  assert.equal(
    await RedisCacheStore.resolveVersionedKeyBestEffort(generationNamespaces, logicalKey),
    oldPhysicalKey
  )
  const refreshedControlTtls = await Promise.all(
    controlKeys.map((controlKey) => connection.ttl(controlKey))
  )
  for (const controlTtl of refreshedControlTtls) {
    assert.isAbove(controlTtl, EXPECTED_GENERATION_CONTROL_TTL_SECONDS - 3)
    assert.isAtMost(controlTtl, EXPECTED_GENERATION_CONTROL_TTL_SECONDS)
  }

  let newPhysicalKey: string | null = null
  cleanup(async () => {
    await Promise.all([
      RedisCacheStore.delete(oldPhysicalKey),
      newPhysicalKey ? RedisCacheStore.delete(newPhysicalKey) : Promise.resolve(),
      ...controlKeys.map((controlKey) => connection.del(controlKey)),
    ])
  })

  await RedisCacheStore.set(oldPhysicalKey, { stale: true }, 300)
  const scansBefore = commandCalls(await connection.info('commandstats'), 'scan')

  await RedisCacheStore.deleteByPattern('tasks:list:*')

  const scansAfter = commandCalls(await connection.info('commandstats'), 'scan')
  const rotatedControlTtl = await connection.ttl(
    cacheGenerationControlKey(TASK_LIST_CACHE_GENERATION_NAMESPACE)
  )
  assert.isAbove(rotatedControlTtl, EXPECTED_GENERATION_CONTROL_TTL_SECONDS - 3)
  assert.isAtMost(rotatedControlTtl, EXPECTED_GENERATION_CONTROL_TTL_SECONDS)
  newPhysicalKey = await RedisCacheStore.resolveVersionedKeyBestEffort(
    generationNamespaces,
    logicalKey
  )
  assert.isNotNull(newPhysicalKey)
  assert.notEqual(newPhysicalKey, oldPhysicalKey)
  assert.equal(scansAfter - scansBefore, 0)
  assert.isNull(await RedisCacheStore.get(newPhysicalKey ?? 'generation-resolution-failed'))
  assert.deepEqual(await RedisCacheStore.get(oldPhysicalKey), { stale: true })

  const metrics = RedisCacheStore.runtimeMetrics()
  assert.equal(metrics.invalidations.generationRotations, 1)
  assert.equal(metrics.invalidations.patternOperations, 0)
  assert.equal(metrics.operations.generation_rotate.count, 1)
  assert.equal(metrics.operations.pattern_delete.count, 0)
}).skip(!RUN_REAL_REDIS, SKIP_REASON)

test('RedisCacheStore | Redis tenant rotation leaves another organization warm', async ({
  assert,
  cleanup,
}) => {
  cacheRuntimeMetrics.resetForTests()
  const firstOrganizationId = randomUUID()
  const secondOrganizationId = randomUUID()
  const firstLogicalKey = `tasks:list:v2:org:${firstOrganizationId}:scope:all:query:${createNamespace()}`
  const secondLogicalKey = `tasks:list:v2:org:${secondOrganizationId}:scope:all:query:${createNamespace()}`
  const firstNamespaces = taskListCacheGenerationNamespaces(firstOrganizationId)
  const secondNamespaces = taskListCacheGenerationNamespaces(secondOrganizationId)
  const connection = Redis.connection('cache')
  const firstPhysicalKey = await RedisCacheStore.resolveVersionedKeyBestEffort(
    firstNamespaces,
    firstLogicalKey
  )
  const secondPhysicalKey = await RedisCacheStore.resolveVersionedKeyBestEffort(
    secondNamespaces,
    secondLogicalKey
  )
  assert.isNotNull(firstPhysicalKey)
  assert.isNotNull(secondPhysicalKey)
  if (!firstPhysicalKey || !secondPhysicalKey) {
    throw new Error('Expected both tenant generation keys to resolve')
  }

  let nextFirstPhysicalKey: string | null = null
  let nextSecondPhysicalKey: string | null = null
  const controlKeys = new Set(
    [...firstNamespaces, ...secondNamespaces].map((generationNamespace) =>
      cacheGenerationControlKey(generationNamespace)
    )
  )
  cleanup(async () => {
    await Promise.all([
      RedisCacheStore.delete(firstPhysicalKey),
      RedisCacheStore.delete(secondPhysicalKey),
      nextFirstPhysicalKey ? RedisCacheStore.delete(nextFirstPhysicalKey) : Promise.resolve(),
      nextSecondPhysicalKey ? RedisCacheStore.delete(nextSecondPhysicalKey) : Promise.resolve(),
      ...[...controlKeys].map((controlKey) => connection.del(controlKey)),
    ])
  })

  await Promise.all([
    RedisCacheStore.set(firstPhysicalKey, { organization: 'first' }, 300),
    RedisCacheStore.set(secondPhysicalKey, { organization: 'second' }, 300),
  ])
  const scansBefore = commandCalls(await connection.info('commandstats'), 'scan')

  await RedisCacheStore.deleteByPattern(`tasks:list:v2:org:${firstOrganizationId}:*`)

  const scansAfter = commandCalls(await connection.info('commandstats'), 'scan')
  nextFirstPhysicalKey = await RedisCacheStore.resolveVersionedKeyBestEffort(
    firstNamespaces,
    firstLogicalKey
  )
  nextSecondPhysicalKey = await RedisCacheStore.resolveVersionedKeyBestEffort(
    secondNamespaces,
    secondLogicalKey
  )
  assert.isNotNull(nextFirstPhysicalKey)
  assert.isNotNull(nextSecondPhysicalKey)
  if (!nextFirstPhysicalKey || !nextSecondPhysicalKey) {
    throw new Error('Expected both tenant generation keys to resolve after rotation')
  }

  assert.notEqual(nextFirstPhysicalKey, firstPhysicalKey)
  assert.equal(nextSecondPhysicalKey, secondPhysicalKey)
  assert.equal(scansAfter - scansBefore, 0)
  assert.isNull(await RedisCacheStore.get(nextFirstPhysicalKey))
  assert.deepEqual(await RedisCacheStore.get(nextSecondPhysicalKey), {
    organization: 'second',
  })
  assert.deepEqual(await RedisCacheStore.get(firstPhysicalKey), {
    organization: 'first',
  })
  assert.equal(RedisCacheStore.runtimeMetrics().invalidations.generationRotations, 1)
}).skip(!RUN_REAL_REDIS, SKIP_REASON)

test('RedisCacheStore | Redis control expiry makes old payload unreachable without deleting it', async ({
  assert,
  cleanup,
}) => {
  const generationNamespace = createNamespace()
  const logicalKey = `${generationNamespace}:logical`
  const controlKey = cacheGenerationControlKey(generationNamespace)
  const connection = Redis.connection('cache')
  const oldPhysicalKey = await RedisCacheStore.resolveVersionedKeyBestEffort(
    generationNamespace,
    logicalKey
  )
  if (!oldPhysicalKey) {
    throw new Error('Expected initial generation key to resolve')
  }

  let newPhysicalKey: string | null = null
  cleanup(async () => {
    await Promise.all([
      RedisCacheStore.deleteBestEffort(oldPhysicalKey),
      newPhysicalKey ? RedisCacheStore.deleteBestEffort(newPhysicalKey) : Promise.resolve(),
      connection.del(controlKey),
    ])
  })

  await RedisCacheStore.set(oldPhysicalKey, { stillPhysical: true }, 60)
  await connection.pexpire(controlKey, 50)
  await new Promise((resolve) => setTimeout(resolve, 100))

  newPhysicalKey = await RedisCacheStore.resolveVersionedKeyBestEffort(
    generationNamespace,
    logicalKey
  )
  assert.isNotNull(newPhysicalKey)
  assert.notEqual(newPhysicalKey, oldPhysicalKey)
  assert.deepEqual(await RedisCacheStore.get(oldPhysicalKey), { stillPhysical: true })
  assert.isNull(await RedisCacheStore.get(newPhysicalKey ?? 'generation-resolution-failed'))

  const controlTtl = await connection.ttl(controlKey)
  assert.isAbove(controlTtl, EXPECTED_GENERATION_CONTROL_TTL_SECONDS - 3)
  assert.isAtMost(controlTtl, EXPECTED_GENERATION_CONTROL_TTL_SECONDS)
}).skip(!RUN_REAL_REDIS, SKIP_REASON)

test('RedisCacheStore | Redis user-task rotation leaves another user warm without SCAN', async ({
  assert,
  cleanup,
}) => {
  cacheRuntimeMetrics.resetForTests()
  const organizationId = randomUUID()
  const firstUserId = randomUUID()
  const secondUserId = randomUUID()
  const firstLogicalKey = `task:user:user:${firstUserId}:org:${organizationId}:filter:both:page:1:limit:10`
  const secondLogicalKey = `task:user:user:${secondUserId}:org:${organizationId}:filter:both:page:1:limit:10`
  const firstNamespaces = organizationUserCacheGenerationNamespaces(
    CACHE_COLLECTION_GENERATION_NAMESPACES.userTasks,
    organizationId,
    firstUserId
  )
  const secondNamespaces = organizationUserCacheGenerationNamespaces(
    CACHE_COLLECTION_GENERATION_NAMESPACES.userTasks,
    organizationId,
    secondUserId
  )
  const firstPhysicalKey = await RedisCacheStore.resolveVersionedKeyBestEffort(
    firstNamespaces,
    firstLogicalKey
  )
  const secondPhysicalKey = await RedisCacheStore.resolveVersionedKeyBestEffort(
    secondNamespaces,
    secondLogicalKey
  )
  assert.isNotNull(firstPhysicalKey)
  assert.isNotNull(secondPhysicalKey)
  if (!firstPhysicalKey || !secondPhysicalKey) {
    throw new Error('Expected both user-task generation keys to resolve')
  }

  const connection = Redis.connection('cache')
  const controlKeys = new Set(
    [...firstNamespaces, ...secondNamespaces].map((namespace) =>
      cacheGenerationControlKey(namespace)
    )
  )
  let nextFirstPhysicalKey: string | null = null
  let nextSecondPhysicalKey: string | null = null
  cleanup(async () => {
    await Promise.all([
      RedisCacheStore.delete(firstPhysicalKey),
      RedisCacheStore.delete(secondPhysicalKey),
      nextFirstPhysicalKey ? RedisCacheStore.delete(nextFirstPhysicalKey) : Promise.resolve(),
      nextSecondPhysicalKey ? RedisCacheStore.delete(nextSecondPhysicalKey) : Promise.resolve(),
      ...[...controlKeys].map((controlKey) => connection.del(controlKey)),
    ])
  })
  await Promise.all([
    RedisCacheStore.set(firstPhysicalKey, { user: 'first' }, 300),
    RedisCacheStore.set(secondPhysicalKey, { user: 'second' }, 300),
  ])

  const scansBefore = commandCalls(await connection.info('commandstats'), 'scan')
  await RedisCacheStore.deleteByPattern(`task:user:user:${firstUserId}:*`)
  const scansAfter = commandCalls(await connection.info('commandstats'), 'scan')

  nextFirstPhysicalKey = await RedisCacheStore.resolveVersionedKeyBestEffort(
    firstNamespaces,
    firstLogicalKey
  )
  nextSecondPhysicalKey = await RedisCacheStore.resolveVersionedKeyBestEffort(
    secondNamespaces,
    secondLogicalKey
  )
  assert.isNotNull(nextFirstPhysicalKey)
  assert.isNotNull(nextSecondPhysicalKey)
  assert.notEqual(nextFirstPhysicalKey, firstPhysicalKey)
  assert.equal(nextSecondPhysicalKey, secondPhysicalKey)
  assert.equal(scansAfter - scansBefore, 0)
  assert.isNull(await RedisCacheStore.get(nextFirstPhysicalKey ?? 'generation-resolution-failed'))
  assert.deepEqual(await RedisCacheStore.get(nextSecondPhysicalKey ?? ''), { user: 'second' })
  assert.deepEqual(await RedisCacheStore.get(firstPhysicalKey), { user: 'first' })
}).skip(!RUN_REAL_REDIS, SKIP_REASON)

test('RedisCacheStore | Redis rotates viewer collections per user without SCAN', async ({
  assert,
  cleanup,
}) => {
  cacheRuntimeMetrics.resetForTests()
  const organizationId = randomUUID()
  const firstUserId = randomUUID()
  const secondUserId = randomUUID()
  const collections = [
    {
      namespace: CACHE_COLLECTION_GENERATION_NAMESPACES.groupedTasks,
      prefix: 'tasks:grouped',
    },
    {
      namespace: CACHE_COLLECTION_GENERATION_NAMESPACES.timelineTasks,
      prefix: 'tasks:timeline',
    },
    {
      namespace: CACHE_COLLECTION_GENERATION_NAMESPACES.taskStatistics,
      prefix: 'task:stats',
    },
  ] as const
  const connection = Redis.connection('cache')
  const entries = await Promise.all(
    collections.map(async ({ namespace, prefix }) => {
      const firstNamespaces = organizationUserCacheGenerationNamespaces(
        namespace,
        organizationId,
        firstUserId
      )
      const secondNamespaces = organizationUserCacheGenerationNamespaces(
        namespace,
        organizationId,
        secondUserId
      )
      const firstLogicalKey = `${prefix}:org:${organizationId}:user:${firstUserId}`
      const secondLogicalKey = `${prefix}:org:${organizationId}:user:${secondUserId}`
      const firstPhysicalKey = await RedisCacheStore.resolveVersionedKeyBestEffort(
        firstNamespaces,
        firstLogicalKey
      )
      const secondPhysicalKey = await RedisCacheStore.resolveVersionedKeyBestEffort(
        secondNamespaces,
        secondLogicalKey
      )
      if (!firstPhysicalKey || !secondPhysicalKey) {
        throw new Error(`Expected user-scoped generation keys for ${namespace}`)
      }

      await Promise.all([
        RedisCacheStore.set(firstPhysicalKey, { viewer: 'first' }, 300),
        RedisCacheStore.set(secondPhysicalKey, { viewer: 'second' }, 300),
      ])

      return {
        namespace,
        prefix,
        firstNamespaces,
        secondNamespaces,
        firstLogicalKey,
        secondLogicalKey,
        firstPhysicalKey,
        secondPhysicalKey,
      }
    })
  )
  const rotatedKeys: string[] = []
  const controlKeys = new Set(
    entries.flatMap(({ firstNamespaces, secondNamespaces }) =>
      [...firstNamespaces, ...secondNamespaces].map((namespace) =>
        cacheGenerationControlKey(namespace)
      )
    )
  )
  cleanup(async () => {
    await Promise.all([
      ...entries.flatMap(({ firstPhysicalKey, secondPhysicalKey }) => [
        RedisCacheStore.delete(firstPhysicalKey),
        RedisCacheStore.delete(secondPhysicalKey),
      ]),
      ...rotatedKeys.map((key) => RedisCacheStore.delete(key)),
      ...[...controlKeys].map((key) => connection.del(key)),
    ])
  })

  const scansBefore = commandCalls(await connection.info('commandstats'), 'scan')
  for (const { prefix } of entries) {
    await RedisCacheStore.deleteByPattern(`${prefix}:*:user:${firstUserId}:*`)
  }
  const scansAfter = commandCalls(await connection.info('commandstats'), 'scan')

  for (const entry of entries) {
    const nextFirstKey = await RedisCacheStore.resolveVersionedKeyBestEffort(
      entry.firstNamespaces,
      entry.firstLogicalKey
    )
    const nextSecondKey = await RedisCacheStore.resolveVersionedKeyBestEffort(
      entry.secondNamespaces,
      entry.secondLogicalKey
    )
    assert.isNotNull(nextFirstKey)
    assert.notEqual(nextFirstKey, entry.firstPhysicalKey)
    assert.equal(nextSecondKey, entry.secondPhysicalKey)
    if (nextFirstKey) rotatedKeys.push(nextFirstKey)
    assert.isNull(await RedisCacheStore.get(nextFirstKey ?? 'generation-resolution-failed'))
    assert.deepEqual(await RedisCacheStore.get(entry.firstPhysicalKey), { viewer: 'first' })
    assert.deepEqual(await RedisCacheStore.get(entry.secondPhysicalKey), { viewer: 'second' })
  }

  assert.equal(scansAfter - scansBefore, 0)
  assert.equal(
    RedisCacheStore.runtimeMetrics().invalidations.generationRotations,
    collections.length
  )
}).skip(!RUN_REAL_REDIS, SKIP_REASON)

test('RedisCacheStore | Redis rotates every task collection generation without SCAN', async ({
  assert,
  cleanup,
}) => {
  cacheRuntimeMetrics.resetForTests()
  const organizationId = randomUUID()
  const taskId = randomUUID()
  const userId = randomUUID()
  const nonce = createNamespace()
  const cases = [
    {
      logicalKey: `tasks:public:v2:query:${nonce}`,
      namespaces: globalCacheGenerationNamespaces(
        CACHE_COLLECTION_GENERATION_NAMESPACES.publicTasks
      ),
      pattern: 'tasks:public:*',
    },
    {
      logicalKey: `task:user:user:${userId}:org:${organizationId}:page:1`,
      namespaces: organizationUserCacheGenerationNamespaces(
        CACHE_COLLECTION_GENERATION_NAMESPACES.userTasks,
        organizationId,
        userId
      ),
      pattern: `task:user:*:org:${organizationId}:*`,
    },
    {
      logicalKey: `tasks:grouped:org:${organizationId}:user:${userId}`,
      namespaces: organizationUserCacheGenerationNamespaces(
        CACHE_COLLECTION_GENERATION_NAMESPACES.groupedTasks,
        organizationId,
        userId
      ),
      pattern: `tasks:grouped:org:${organizationId}:*`,
    },
    {
      logicalKey: `tasks:timeline:org:${organizationId}:user:${userId}`,
      namespaces: organizationUserCacheGenerationNamespaces(
        CACHE_COLLECTION_GENERATION_NAMESPACES.timelineTasks,
        organizationId,
        userId
      ),
      pattern: `tasks:timeline:org:${organizationId}:*`,
    },
    {
      logicalKey: `task:stats:org:${organizationId}:user:${userId}`,
      namespaces: organizationUserCacheGenerationNamespaces(
        CACHE_COLLECTION_GENERATION_NAMESPACES.taskStatistics,
        organizationId,
        userId
      ),
      pattern: `task:stats:org:${organizationId}:*`,
    },
    {
      logicalKey: `task:metadata:v3:org:${organizationId}`,
      namespaces: organizationCacheGenerationNamespaces(
        CACHE_COLLECTION_GENERATION_NAMESPACES.taskMetadata,
        organizationId
      ),
      pattern: `task:metadata:*:org:${organizationId}*`,
    },
    {
      logicalKey: `task:audit:${taskId}:viewer:${userId}:limit:20`,
      namespaces: entityCacheGenerationNamespaces(
        CACHE_COLLECTION_GENERATION_NAMESPACES.taskAudit,
        'task',
        taskId
      ),
      pattern: `task:audit:${taskId}:*`,
    },
    {
      logicalKey: `task:applications:page:1:taskId:${taskId}:userId:${userId}`,
      namespaces: entityCacheGenerationNamespaces(
        CACHE_COLLECTION_GENERATION_NAMESPACES.taskApplications,
        'task',
        taskId
      ),
      pattern: `task:applications:*:taskId:${taskId}:*`,
    },
    {
      logicalKey: `user:applications:page:1:userId:${userId}`,
      namespaces: entityCacheGenerationNamespaces(
        CACHE_COLLECTION_GENERATION_NAMESPACES.userApplications,
        'user',
        userId
      ),
      pattern: `user:applications:*:userId:${userId}*`,
    },
    {
      logicalKey: `users:work_history:${userId}:public`,
      namespaces: entityCacheGenerationNamespaces(
        CACHE_COLLECTION_GENERATION_NAMESPACES.userWorkHistory,
        'user',
        userId
      ),
      pattern: `users:work_history:${userId}:*`,
    },
    {
      logicalKey: `orgs:list:user:${userId}:page:1`,
      namespaces: entityCacheGenerationNamespaces(
        CACHE_COLLECTION_GENERATION_NAMESPACES.organizationList,
        'user',
        userId
      ),
      pattern: `orgs:list:user:${userId}:*`,
    },
    {
      logicalKey: `org:detail:${organizationId}:includes:none`,
      namespaces: organizationCacheGenerationNamespaces(
        CACHE_COLLECTION_GENERATION_NAMESPACES.organizationDetail,
        organizationId
      ),
      pattern: `org:detail:${organizationId}:*`,
    },
    {
      logicalKey: `org:members:org:${organizationId}:page:1`,
      namespaces: organizationCacheGenerationNamespaces(
        CACHE_COLLECTION_GENERATION_NAMESPACES.organizationMembers,
        organizationId
      ),
      pattern: `org:members:org:${organizationId}:*`,
    },
    {
      logicalKey: `user:pending_reviews:after::before::perPage:10:userId:${userId}`,
      namespaces: entityCacheGenerationNamespaces(
        CACHE_COLLECTION_GENERATION_NAMESPACES.pendingReviews,
        'user',
        userId
      ),
      pattern: `user:pending_reviews:*:userId:${userId}`,
    },
  ] as const
  const connection = Redis.connection('cache')
  const oldKeys: string[] = []
  const newKeys: string[] = []
  const controlKeys = new Set(
    cases.flatMap(({ namespaces }) =>
      namespaces.map((generationNamespace) => cacheGenerationControlKey(generationNamespace))
    )
  )
  cleanup(async () => {
    await Promise.all([
      ...oldKeys.map((key) => RedisCacheStore.delete(key)),
      ...newKeys.map((key) => RedisCacheStore.delete(key)),
      ...[...controlKeys].map((key) => connection.del(key)),
    ])
  })

  for (const entry of cases) {
    const oldKey = await RedisCacheStore.resolveVersionedKeyBestEffort(
      entry.namespaces,
      entry.logicalKey
    )
    assert.isNotNull(oldKey)
    if (!oldKey) {
      throw new Error(`Expected generation key for ${entry.pattern}`)
    }
    oldKeys.push(oldKey)
    await RedisCacheStore.set(oldKey, { stale: entry.pattern }, 300)
  }

  const scansBefore = commandCalls(await connection.info('commandstats'), 'scan')
  for (const entry of cases) {
    await RedisCacheStore.deleteByPattern(entry.pattern)
  }
  const scansAfter = commandCalls(await connection.info('commandstats'), 'scan')

  for (const [index, entry] of cases.entries()) {
    const newKey = await RedisCacheStore.resolveVersionedKeyBestEffort(
      entry.namespaces,
      entry.logicalKey
    )
    assert.isNotNull(newKey)
    if (!newKey) {
      throw new Error(`Expected rotated generation key for ${entry.pattern}`)
    }
    newKeys.push(newKey)
    assert.notEqual(newKey, oldKeys[index])
    assert.isNull(await RedisCacheStore.get(newKey))
    assert.deepEqual(await RedisCacheStore.get(oldKeys[index] ?? ''), {
      stale: entry.pattern,
    })
  }

  assert.equal(scansAfter - scansBefore, 0)
  assert.equal(RedisCacheStore.runtimeMetrics().invalidations.generationRotations, cases.length)
  assert.equal(RedisCacheStore.runtimeMetrics().invalidations.patternOperations, 0)
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
