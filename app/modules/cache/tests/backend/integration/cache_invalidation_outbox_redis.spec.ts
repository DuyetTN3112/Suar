import { randomUUID } from 'node:crypto'

import db from '@adonisjs/lucid/services/db'
import Redis from '@adonisjs/redis/services/main'
import { test } from '@japa/runner'

import { makeGetPendingReviewsQuery } from '#composition/review_pending_query_composition'
import {
  CACHE_INVALIDATION_OUTBOX_DOWN_SQL,
  CACHE_INVALIDATION_OUTBOX_UP_SQL,
} from '#database/cache_invalidation_outbox_schema'
import { cacheGenerationControlKey } from '#modules/cache/domain/cache_generation_policy'
import { PostgresCacheInvalidationOutboxRepository } from '#modules/cache/infra/postgres_cache_invalidation_outbox_repository'
import RedisCacheStore from '#modules/cache/infra/redis_cache_store'
import { CacheInvalidationOutboxWorker } from '#modules/cache/infra/workers/cache_invalidation_outbox_worker'
import {
  CACHE_COLLECTION_GENERATION_NAMESPACES,
  entityCacheGenerationNamespaces,
  reviewSessionCacheKey,
  taskListCacheGenerationNamespaces,
} from '#modules/cache/public_contracts/cache_contract'
import { makeSystemReviewActionContext } from '#modules/reviews/actions/review_action_context'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  cleanupTestData,
  OrganizationFactory,
  OrganizationUserFactory,
  ProjectMemberFactory,
  ReviewSessionFactory,
  TaskAssignmentFactory,
  TaskFactory,
  UserFactory,
} from '#tests/helpers/factories'

const RUN_REAL_REDIS = process.env['CACHE_INTEGRATION_DRIVER'] === 'redis'
const SKIP_REASON = 'Set CACHE_INTEGRATION_DRIVER=redis to run the cache outbox against real Redis'
let schemaWasPreexisting = false

async function outboxTableExists(): Promise<boolean> {
  const row = (await db
    .from('information_schema.tables')
    .where('table_schema', 'public')
    .where('table_name', 'cache_invalidation_outbox')
    .first()) as { table_name?: string } | undefined

  return Boolean(row)
}

async function installSchema(): Promise<void> {
  schemaWasPreexisting = await outboxTableExists()
  for (const statement of CACHE_INVALIDATION_OUTBOX_DOWN_SQL) {
    if (!schemaWasPreexisting) {
      await db.rawQuery(statement)
    }
  }
  for (const statement of CACHE_INVALIDATION_OUTBOX_UP_SQL) {
    await db.rawQuery(statement)
  }
}

async function uninstallSchema(): Promise<void> {
  if (schemaWasPreexisting) {
    return
  }

  for (const statement of CACHE_INVALIDATION_OUTBOX_DOWN_SQL) {
    await db.rawQuery(statement)
  }
}

test.group('Integration | Cache invalidation outbox with real Redis', (group) => {
  group.setup(async () => {
    if (!RUN_REAL_REDIS) {
      return
    }
    await setupApp()
    await installSchema()
  })

  group.teardown(async () => {
    if (!RUN_REAL_REDIS) {
      return
    }
    await cleanupTestData()
    await db.from('cache_invalidation_outbox').delete()
    await uninstallSchema()
    await teardownApp()
  })

  test('DB commit leaves stale role variants until the durable worker rotates their generation', async ({
    assert,
    cleanup,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const { org: otherOrg } = await OrganizationFactory.createWithOwner()
    const member = await UserFactory.create({ current_organization_id: org.id })
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: member.id,
      org_role: 'org_member',
      status: 'approved',
    })
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
    })
    await db.from('cache_invalidation_outbox').delete()

    const namespace = `outbox-real:${randomUUID()}`
    const ownerLogicalKey = `tasks:list:v2:org:${org.id}:scope:all:query:${namespace}:owner`
    const memberLogicalKey = `tasks:list:v2:org:${org.id}:scope:own_only:user:${member.id}:query:${namespace}:member`
    const otherOrganizationLogicalKey = `tasks:list:v2:org:${otherOrg.id}:scope:all:query:${namespace}:other`
    const generationNamespaces = taskListCacheGenerationNamespaces(org.id)
    const otherGenerationNamespaces = taskListCacheGenerationNamespaces(otherOrg.id)
    const ownerCollectionKey = await RedisCacheStore.resolveVersionedKeyBestEffort(
      generationNamespaces,
      ownerLogicalKey
    )
    const memberCollectionKey = await RedisCacheStore.resolveVersionedKeyBestEffort(
      generationNamespaces,
      memberLogicalKey
    )
    const otherOrganizationCollectionKey = await RedisCacheStore.resolveVersionedKeyBestEffort(
      otherGenerationNamespaces,
      otherOrganizationLogicalKey
    )
    assert.isNotNull(ownerCollectionKey)
    assert.isNotNull(memberCollectionKey)
    assert.isNotNull(otherOrganizationCollectionKey)
    if (!ownerCollectionKey || !memberCollectionKey || !otherOrganizationCollectionKey) {
      throw new Error('Expected task-list generation keys to resolve against real Redis')
    }

    const taskAuditLogicalKey = `task:audit:${task.id}:viewer:${owner.id}:limit:20`
    const taskAuditNamespaces = entityCacheGenerationNamespaces(
      CACHE_COLLECTION_GENERATION_NAMESPACES.taskAudit,
      'task',
      task.id
    )
    const taskAuditKey = await RedisCacheStore.resolveVersionedKeyBestEffort(
      taskAuditNamespaces,
      taskAuditLogicalKey
    )
    assert.isNotNull(taskAuditKey)
    if (!taskAuditKey) {
      throw new Error('Expected task-audit generation key to resolve against real Redis')
    }
    const unrelatedKey = `${namespace}:unrelated`
    const connection = Redis.connection('cache')
    const controlKeys = new Set(
      [...generationNamespaces, ...otherGenerationNamespaces, ...taskAuditNamespaces].map(
        (generationNamespace) => cacheGenerationControlKey(generationNamespace)
      )
    )
    let nextOwnerCollectionKey: string | null = null
    let nextMemberCollectionKey: string | null = null
    let nextOtherOrganizationCollectionKey: string | null = null
    let nextTaskAuditKey: string | null = null
    cleanup(async () => {
      await Promise.all([
        RedisCacheStore.delete(ownerCollectionKey),
        RedisCacheStore.delete(memberCollectionKey),
        RedisCacheStore.delete(otherOrganizationCollectionKey),
        nextOwnerCollectionKey ? RedisCacheStore.delete(nextOwnerCollectionKey) : Promise.resolve(),
        nextMemberCollectionKey
          ? RedisCacheStore.delete(nextMemberCollectionKey)
          : Promise.resolve(),
        nextOtherOrganizationCollectionKey
          ? RedisCacheStore.delete(nextOtherOrganizationCollectionKey)
          : Promise.resolve(),
        RedisCacheStore.delete(taskAuditKey),
        nextTaskAuditKey ? RedisCacheStore.delete(nextTaskAuditKey) : Promise.resolve(),
        RedisCacheStore.delete(unrelatedKey),
        ...[...controlKeys].map((controlKey) => connection.del(controlKey)),
      ])
    })

    await Promise.all([
      RedisCacheStore.set(ownerCollectionKey, { title: 'stale-owner-view' }, 300),
      RedisCacheStore.set(memberCollectionKey, { title: 'stale-member-view' }, 300),
      RedisCacheStore.set(
        otherOrganizationCollectionKey,
        { title: 'other-organization-warm-view' },
        300
      ),
      RedisCacheStore.set(taskAuditKey, { event: 'stale-audit' }, 300),
      RedisCacheStore.set(unrelatedKey, { keep: true }, 300),
    ])

    await db.from('tasks').where('id', task.id).update({ title: 'fresh-database-title' })

    assert.deepEqual(await RedisCacheStore.get(ownerCollectionKey), {
      title: 'stale-owner-view',
    })
    assert.deepEqual(await RedisCacheStore.get(memberCollectionKey), {
      title: 'stale-member-view',
    })
    assert.deepEqual(await RedisCacheStore.get(taskAuditKey), {
      event: 'stale-audit',
    })

    const repository = new PostgresCacheInvalidationOutboxRepository()
    const worker = new CacheInvalidationOutboxWorker({
      repository,
      workerId: 'cache-real-redis-worker',
    })
    const firstRun = await worker.runOnce()
    const secondRun = await worker.runOnce()

    assert.equal(firstRun.claimed, 1)
    assert.equal(firstRun.processed, 1)
    assert.equal(secondRun.claimed, 0)
    nextOwnerCollectionKey = await RedisCacheStore.resolveVersionedKeyBestEffort(
      generationNamespaces,
      ownerLogicalKey
    )
    nextMemberCollectionKey = await RedisCacheStore.resolveVersionedKeyBestEffort(
      generationNamespaces,
      memberLogicalKey
    )
    nextOtherOrganizationCollectionKey = await RedisCacheStore.resolveVersionedKeyBestEffort(
      otherGenerationNamespaces,
      otherOrganizationLogicalKey
    )
    nextTaskAuditKey = await RedisCacheStore.resolveVersionedKeyBestEffort(
      taskAuditNamespaces,
      taskAuditLogicalKey
    )
    assert.isNotNull(nextOwnerCollectionKey)
    assert.isNotNull(nextMemberCollectionKey)
    assert.isNotNull(nextOtherOrganizationCollectionKey)
    assert.isNotNull(nextTaskAuditKey)
    assert.notEqual(nextOwnerCollectionKey, ownerCollectionKey)
    assert.notEqual(nextMemberCollectionKey, memberCollectionKey)
    assert.equal(nextOtherOrganizationCollectionKey, otherOrganizationCollectionKey)
    assert.isNull(
      await RedisCacheStore.get(nextOwnerCollectionKey ?? 'owner-generation-resolution-failed')
    )
    assert.isNull(
      await RedisCacheStore.get(nextMemberCollectionKey ?? 'member-generation-resolution-failed')
    )
    assert.deepEqual(await RedisCacheStore.get(ownerCollectionKey), {
      title: 'stale-owner-view',
    })
    assert.deepEqual(await RedisCacheStore.get(memberCollectionKey), {
      title: 'stale-member-view',
    })
    assert.deepEqual(
      await RedisCacheStore.get(
        nextOtherOrganizationCollectionKey ?? 'other-generation-resolution-failed'
      ),
      { title: 'other-organization-warm-view' }
    )
    assert.notEqual(nextTaskAuditKey, taskAuditKey)
    assert.isNull(await RedisCacheStore.get(nextTaskAuditKey ?? 'task-audit-resolution-failed'))
    assert.deepEqual(await RedisCacheStore.get(taskAuditKey), { event: 'stale-audit' })
    assert.deepEqual(await RedisCacheStore.get(unrelatedKey), { keep: true })

    const outbox = (await db
      .from('cache_invalidation_outbox')
      .where('source_table', 'tasks')
      .where('source_primary_key', task.id)
      .first()) as { status: string; processed_at: Date | null } | undefined
    assert.equal(outbox?.status, 'processed')
    assert.exists(outbox?.processed_at)
  }).skip(!RUN_REAL_REDIS, SKIP_REASON)

  test('revoked project member stops seeing a warm pending-review projection after outbox delivery', async ({
    assert,
    cleanup,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const reviewer = await UserFactory.create()
    const reviewee = await UserFactory.create()
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
    })
    if (!task.project_id) {
      throw new Error('Expected a project-backed task')
    }
    await ProjectMemberFactory.create({
      project_id: task.project_id,
      user_id: reviewer.id,
      project_role: 'project_member',
    })
    const assignment = await TaskAssignmentFactory.create({
      task_id: task.id,
      assignee_id: reviewee.id,
      assigned_by: owner.id,
      assignment_status: 'completed',
    })
    const session = await ReviewSessionFactory.create({
      task_assignment_id: assignment.id,
      reviewee_id: reviewee.id,
      status: 'pending',
    })
    await db.from('cache_invalidation_outbox').delete()

    const logicalKey = `user:pending_reviews:after::before::perPage:10:userId:${reviewer.id}`
    const namespaces = entityCacheGenerationNamespaces(
      CACHE_COLLECTION_GENERATION_NAMESPACES.pendingReviews,
      'user',
      reviewer.id
    )
    const connection = Redis.connection('cache')
    const controlKeys = namespaces.map((namespace) => cacheGenerationControlKey(namespace))
    const query = makeGetPendingReviewsQuery(makeSystemReviewActionContext(reviewer.id))
    const firstResult = await query.handle({ page: 1, per_page: 10 })
    const firstPhysicalKey = await RedisCacheStore.resolveVersionedKeyBestEffort(
      namespaces,
      logicalKey
    )
    assert.isNotNull(firstPhysicalKey)
    if (!firstPhysicalKey) {
      throw new Error('Expected pending-review generation key against real Redis')
    }

    let nextPhysicalKey: string | null = null
    cleanup(async () => {
      await Promise.all([
        RedisCacheStore.delete(firstPhysicalKey),
        nextPhysicalKey ? RedisCacheStore.delete(nextPhysicalKey) : Promise.resolve(),
        ...controlKeys.map((controlKey) => connection.del(controlKey)),
      ])
    })

    assert.include(
      firstResult.data.map((row) => row.id),
      session.id
    )
    await db
      .from('project_members')
      .where('project_id', task.project_id)
      .where('user_id', reviewer.id)
      .delete()

    const staleBeforeDelivery = await query.handle({ page: 1, per_page: 10 })
    assert.include(
      staleBeforeDelivery.data.map((row) => row.id),
      session.id
    )

    const worker = new CacheInvalidationOutboxWorker({
      repository: new PostgresCacheInvalidationOutboxRepository(),
      workerId: 'cache-review-membership-worker',
    })
    const delivery = await worker.runOnce()
    assert.equal(delivery.claimed, 1)
    assert.equal(delivery.processed, 1)

    nextPhysicalKey = await RedisCacheStore.resolveVersionedKeyBestEffort(namespaces, logicalKey)
    assert.isNotNull(nextPhysicalKey)
    assert.notEqual(nextPhysicalKey, firstPhysicalKey)

    const freshAfterDelivery = await query.handle({ page: 1, per_page: 10 })
    assert.notInclude(
      freshAfterDelivery.data.map((row) => row.id),
      session.id
    )
    assert.isNull(await RedisCacheStore.get(firstPhysicalKey))
  }).skip(!RUN_REAL_REDIS, SKIP_REASON)

  test('deletes the active v4 review-session key after durable delivery', async ({
    assert,
    cleanup,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const reviewee = await UserFactory.create()
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
    })
    const assignment = await TaskAssignmentFactory.create({
      task_id: task.id,
      assignee_id: reviewee.id,
      assigned_by: owner.id,
      assignment_status: 'completed',
    })
    const session = await ReviewSessionFactory.create({
      task_assignment_id: assignment.id,
      reviewee_id: reviewee.id,
      status: 'pending',
    })
    const key = reviewSessionCacheKey(session.id)
    await db.from('cache_invalidation_outbox').delete()
    await RedisCacheStore.set(key, { stale: true }, 300)
    cleanup(async () => {
      await RedisCacheStore.deleteBestEffort(key)
    })

    await session.merge({ status: 'in_progress' }).save()
    assert.deepEqual(await RedisCacheStore.get(key), { stale: true })

    const worker = new CacheInvalidationOutboxWorker({
      repository: new PostgresCacheInvalidationOutboxRepository(),
      workerId: 'cache-review-session-v4-worker',
    })
    const delivery = await worker.runOnce()

    assert.equal(delivery.claimed, 1)
    assert.equal(delivery.processed, 1)
    assert.isNull(await RedisCacheStore.get(key))
  }).skip(!RUN_REAL_REDIS, SKIP_REASON)
})
