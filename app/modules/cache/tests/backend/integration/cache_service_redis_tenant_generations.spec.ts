import { randomUUID } from 'node:crypto'

import Redis from '@adonisjs/redis/services/main'
import { test } from '@japa/runner'

import {
  commandCalls,
  createNamespace,
  EXPECTED_GENERATION_CONTROL_TTL_SECONDS,
  RUN_REAL_REDIS,
  SKIP_REASON,
} from './support/cache_service_redis_fixtures.js'

import {
  cacheGenerationControlKey,
  TASK_LIST_CACHE_GENERATION_NAMESPACE,
} from '#modules/cache/domain/cache-runtime/cache_generation_policy'
import { cacheRuntimeMetrics } from '#modules/cache/infra/adapters/cache-runtime/cache_runtime_metrics'
import RedisCacheStore from '#modules/cache/infra/adapters/cache-runtime/redis_cache_store'
import {
  CACHE_COLLECTION_GENERATION_NAMESPACES,
  organizationUserCacheGenerationNamespaces,
  taskListCacheGenerationNamespaces,
} from '#modules/cache/public_contracts/cache_contract'


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
