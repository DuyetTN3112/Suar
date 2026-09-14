import { randomUUID } from 'node:crypto'

import Redis from '@adonisjs/redis/services/main'
import { test } from '@japa/runner'

import {
  commandCalls,
  createNamespace,
  RUN_REAL_REDIS,
  SKIP_REASON,
} from './support/cache_service_redis_fixtures.js'

import { cacheGenerationControlKey } from '#modules/cache/domain/cache-runtime/cache_generation_policy'
import { cacheRuntimeMetrics } from '#modules/cache/infra/adapters/cache-runtime/cache_runtime_metrics'
import RedisCacheStore from '#modules/cache/infra/adapters/cache-runtime/redis_cache_store'
import {
  CACHE_COLLECTION_GENERATION_NAMESPACES,
  entityCacheGenerationNamespaces,
  globalCacheGenerationNamespaces,
  organizationCacheGenerationNamespaces,
  organizationUserCacheGenerationNamespaces,
} from '#modules/cache/public_contracts/cache_contract'


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
