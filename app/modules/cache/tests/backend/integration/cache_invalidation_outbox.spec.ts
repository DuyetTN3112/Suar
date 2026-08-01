import { randomUUID } from 'node:crypto'

import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import { replayCacheInvalidationOutboxCommand } from '#composition/cache_invalidation_replay_composition'
import {
  CACHE_INVALIDATION_OUTBOX_DOWN_SQL,
  CACHE_INVALIDATION_OUTBOX_UP_SQL,
} from '#database/cache_invalidation_outbox_schema'
import { PostgresCacheInvalidationOutboxRepository } from '#modules/cache/infra/postgres_cache_invalidation_outbox_repository'
import { CacheInvalidationOutboxWorker } from '#modules/cache/infra/workers/cache_invalidation_outbox_worker'
import UserProfileSnapshot from '#modules/users/infra/models/user_profile_snapshot'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  cleanupTestData,
  OrganizationFactory,
  OrganizationUserFactory,
  ProjectMemberFactory,
  ProjectFactory,
  SkillFactory,
  TaskApplicationFactory,
  TaskAssignmentFactory,
  TaskFactory,
  UserFactory,
} from '#tests/helpers/factories'

const baseTime = new Date('2026-07-23T00:00:00.000Z')
let syntheticTransactionId = 9_000_000
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

async function clearOutbox(): Promise<void> {
  await db.from('cache_invalidation_outbox').delete()
}

async function seedOutbox(
  patterns: unknown,
  options: { attemptCount?: number; availableAt?: Date } = {}
): Promise<string> {
  syntheticTransactionId += 1
  const id = randomUUID()
  await db.table('cache_invalidation_outbox').insert({
    id,
    transaction_id: syntheticTransactionId,
    source_table: 'tasks',
    source_operation: 'UPDATE',
    source_primary_key: randomUUID(),
    patterns: JSON.stringify(patterns),
    attempt_count: options.attemptCount ?? 0,
    available_at: options.availableAt ?? baseTime,
  })
  return id
}

async function outboxRow(id: string): Promise<Record<string, unknown>> {
  const row = (await db.from('cache_invalidation_outbox').where('id', id).first()) as
    | Record<string, unknown>
    | undefined
  if (!row) {
    throw new Error(`Missing cache invalidation outbox row ${id}`)
  }
  return row
}

test.group('Integration | Cache invalidation transactional outbox', (group) => {
  group.setup(async () => {
    await setupApp()
    await installSchema()
  })

  group.teardown(async () => {
    await uninstallSchema()
    await teardownApp()
  })

  group.each.teardown(async () => {
    await cleanupTestData()
    await clearOutbox()
  })

  test('trigger intent rolls back and commits atomically with the task mutation', async ({
    assert,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
    })
    await clearOutbox()

    const rollbackTrx = await db.transaction()
    await rollbackTrx
      .from('tasks')
      .where('id', task.id)
      .update({ title: 'sensitive-title-must-not-enter-outbox' })
    const rollbackIntent = (await rollbackTrx
      .from('cache_invalidation_outbox')
      .where('source_table', 'tasks')
      .first()) as { patterns: string[] } | undefined

    assert.exists(rollbackIntent)
    assert.include(rollbackIntent?.patterns ?? [], `task:audit:${task.id}:*`)
    assert.notInclude(JSON.stringify(rollbackIntent), 'sensitive-title-must-not-enter-outbox')
    await rollbackTrx.rollback()
    assert.equal(
      Number(
        (
          (await db.from('cache_invalidation_outbox').count('* as count').first()) as
            | { count?: number | string }
            | undefined
        )?.count ?? 0
      ),
      0
    )

    const commitTrx = await db.transaction()
    await commitTrx.from('tasks').where('id', task.id).update({ title: 'committed-title' })
    await commitTrx.commit()

    const committedIntent = (await db
      .from('cache_invalidation_outbox')
      .where('source_table', 'tasks')
      .where('source_primary_key', task.id)
      .first()) as { patterns: string[]; status: string } | undefined
    assert.exists(committedIntent)
    assert.equal(committedIntent?.status, 'pending')
    assert.include(committedIntent?.patterns ?? [], `tasks:list:v2:org:${org.id}:*`)
    assert.include(committedIntent?.patterns ?? [], `task:user:*:org:${org.id}:*`)
    assert.include(committedIntent?.patterns ?? [], `tasks:grouped:org:${org.id}:*`)
    assert.include(committedIntent?.patterns ?? [], `tasks:timeline:org:${org.id}:*`)
    assert.include(committedIntent?.patterns ?? [], `task:stats:org:${org.id}:*`)
    assert.include(committedIntent?.patterns ?? [], `task:metadata:*:org:${org.id}*`)
    assert.notInclude(committedIntent?.patterns ?? [], 'tasks:list:*')
    assert.notInclude(committedIntent?.patterns ?? [], 'task:user:*')
    assert.notInclude(committedIntent?.patterns ?? [], 'tasks:grouped:*')
    assert.notInclude(JSON.stringify(committedIntent), 'committed-title')
  })

  test('permission-affecting membership changes enqueue scoped invalidations', async ({
    assert,
  }) => {
    const { org } = await OrganizationFactory.createWithOwner()
    const member = await UserFactory.create()
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: member.id,
      status: 'approved',
      org_role: 'org_member',
    })
    await clearOutbox()

    await db
      .from('organization_users')
      .where('organization_id', org.id)
      .where('user_id', member.id)
      .update({ org_role: 'org_admin' })

    const intent = (await db
      .from('cache_invalidation_outbox')
      .where('source_table', 'organization_users')
      .first()) as { patterns: string[]; source_primary_key: string } | undefined
    assert.exists(intent)
    assert.equal(intent?.source_primary_key, `${org.id}:${member.id}`)
    assert.include(intent?.patterns ?? [], 'orgs:list:*')
    assert.include(intent?.patterns ?? [], `orgs:list:user:${member.id}:*`)
    assert.notInclude(intent?.patterns ?? [], `users:list:*:orgId:${org.id}:*`)
    assert.include(intent?.patterns ?? [], `tasks:list:v2:org:${org.id}:*`)
    assert.include(intent?.patterns ?? [], `task:user:*:org:${org.id}:*`)
    assert.include(intent?.patterns ?? [], `tasks:grouped:org:${org.id}:*`)
    assert.include(intent?.patterns ?? [], `task:metadata:*:org:${org.id}*`)
    assert.include(intent?.patterns ?? [], `users:work_history:${member.id}:*`)
    assert.notInclude(intent?.patterns ?? [], 'task:user:*')
    assert.notInclude(intent?.patterns ?? [], 'tasks:grouped:*')
    assert.notInclude(intent?.patterns ?? [], `perm:*:${member.id}*`)
  })

  test('project creation rotates organization-list counts globally in O(1)', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    await clearOutbox()

    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
    })

    const intent = (await db
      .from('cache_invalidation_outbox')
      .where('source_table', 'projects')
      .where('source_primary_key', project.id)
      .first()) as { patterns: string[] } | undefined

    assert.exists(intent)
    assert.include(intent?.patterns ?? [], 'orgs:list:*')
  })

  test('project membership changes rotate only the affected reviewer pending list', async ({
    assert,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const reviewer = await UserFactory.create()
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
    await clearOutbox()

    await db
      .from('project_members')
      .where('project_id', task.project_id)
      .where('user_id', reviewer.id)
      .update({ project_role: 'project_manager' })

    const intent = (await db
      .from('cache_invalidation_outbox')
      .where('source_table', 'project_members')
      .first()) as { patterns: string[] } | undefined

    assert.exists(intent)
    assert.include(intent?.patterns ?? [], `user:pending_reviews:*:userId:${reviewer.id}`)
    assert.notInclude(intent?.patterns ?? [], 'user:pending_reviews:*')
  })

  test('snapshot mutations do not enqueue dead Redis invalidations while snapshot caching is disabled', async ({
    assert,
  }) => {
    const user = await UserFactory.create()
    const snapshot = await UserProfileSnapshot.create({
      user_id: user.id,
      version: 1,
      is_current: true,
      is_public: false,
      shareable_slug: `uncached-snapshot-${user.id}`,
      shareable_token: 'not-for-redis',
      summary: {},
      skills_verified: [],
      work_highlights: [],
      performance_metrics: {},
      trust_metrics: {},
      scoring_version: 'v1',
    })
    await clearOutbox()

    await snapshot.merge({ snapshot_name: 'Updated without cache invalidation' }).save()

    const outboxCount = Number(
      (
        (await db
          .from('cache_invalidation_outbox')
          .where('source_table', 'user_profile_snapshots')
          .count('* as count')
          .first()) as { count?: number | string } | undefined
      )?.count ?? 0
    )
    const trigger = (await db
      .from('pg_trigger')
      .where('tgname', 'cache_invalidation_outbox_after_change')
      .whereRaw('tgrelid = ?::regclass', ['public.user_profile_snapshots'])
      .first()) as { tgname?: string } | undefined

    assert.equal(outboxCount, 0)
    assert.notExists(trigger)
  })

  test('skill metadata changes invalidate every active skill-derived projection', async ({
    assert,
  }) => {
    const skill = await SkillFactory.create()
    await clearOutbox()

    await skill.merge({ skill_name: `updated-${skill.skill_name}` }).save()

    const intent = (await db
      .from('cache_invalidation_outbox')
      .where('source_table', 'skills')
      .first()) as { patterns: string[] } | undefined

    assert.exists(intent)
    assert.sameMembers(intent?.patterns ?? [], [
      'task:metadata:*',
      'review:session:v4:*',
      'users:featured_reviews:v2:*',
      'users:spider_chart:v4:*',
    ])
  })

  test('child task mutations derive tenant-scoped invalidation from the parent task', async ({
    assert,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const assignee = await UserFactory.create()
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
    })
    await clearOutbox()

    await TaskAssignmentFactory.create({
      task_id: task.id,
      assignee_id: assignee.id,
      assigned_by: owner.id,
    })

    const intent = (await db
      .from('cache_invalidation_outbox')
      .where('source_table', 'task_assignments')
      .first()) as { patterns: string[] } | undefined

    assert.exists(intent)
    assert.include(intent?.patterns ?? [], `tasks:list:v2:org:${org.id}:*`)
    assert.include(intent?.patterns ?? [], `task:user:*:org:${org.id}:*`)
    assert.include(intent?.patterns ?? [], `task:applications:*:taskId:${task.id}:*`)
    assert.notInclude(intent?.patterns ?? [], 'tasks:list:*')
  })

  test('application mutations target the task, applicant, and tenant generations', async ({
    assert,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const applicant = await UserFactory.create()
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
    })
    await clearOutbox()

    await TaskApplicationFactory.create({
      task_id: task.id,
      applicant_id: applicant.id,
      application_status: 'pending',
    })

    const intent = (await db
      .from('cache_invalidation_outbox')
      .where('source_table', 'task_applications')
      .first()) as { patterns: string[] } | undefined

    assert.exists(intent)
    assert.include(intent?.patterns ?? [], `task:applications:*:taskId:${task.id}:*`)
    assert.include(intent?.patterns ?? [], `user:applications:*:userId:${applicant.id}*`)
    assert.include(intent?.patterns ?? [], `task:user:*:org:${org.id}:*`)
    assert.include(intent?.patterns ?? [], 'tasks:public:*')
    assert.include(intent?.patterns ?? [], `tasks:grouped:org:${org.id}:*`)
    assert.include(intent?.patterns ?? [], `tasks:timeline:org:${org.id}:*`)
    assert.include(intent?.patterns ?? [], `task:stats:org:${org.id}:*`)
    assert.include(intent?.patterns ?? [], `tasks:list:v2:org:${org.id}:*`)
    assert.notInclude(intent?.patterns ?? [], 'task:applications:*')
    assert.notInclude(intent?.patterns ?? [], 'user:applications:*')
  })

  test('timestamp-only ORM touches do not enqueue broad cache scans', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
    })
    await clearOutbox()

    await db
      .from('tasks')
      .where('id', task.id)
      .update({ updated_at: new Date(baseTime.getTime() + 60_000) })

    const timestampOnlyCount = Number(
      (
        (await db
          .from('cache_invalidation_outbox')
          .where('source_table', 'tasks')
          .count('* as count')
          .first()) as { count?: number | string } | undefined
      )?.count ?? 0
    )
    assert.equal(timestampOnlyCount, 0)

    await db.from('tasks').where('id', task.id).update({ title: 'cache-relevant change' })
    const relevantCount = Number(
      (
        (await db
          .from('cache_invalidation_outbox')
          .where('source_table', 'tasks')
          .count('* as count')
          .first()) as { count?: number | string } | undefined
      )?.count ?? 0
    )
    assert.equal(relevantCount, 1)
  })

  test('concurrent workers claim disjoint bounded batches', async ({ assert }) => {
    const ids = await Promise.all(Array.from({ length: 6 }, () => seedOutbox(['tasks:list:*'])))
    const repository = new PostgresCacheInvalidationOutboxRepository()

    const [first, second] = await Promise.all([
      repository.claimBatch({
        workerId: 'cache-worker-a',
        batchSize: 3,
        leaseDurationMs: 60_000,
        now: baseTime,
      }),
      repository.claimBatch({
        workerId: 'cache-worker-b',
        batchSize: 3,
        leaseDurationMs: 60_000,
        now: baseTime,
      }),
    ])

    const claimedIds = [...first, ...second].map((job) => job.id)
    assert.lengthOf(first, 3)
    assert.lengthOf(second, 3)
    assert.lengthOf(new Set(claimedIds), 6)
    assert.sameMembers(claimedIds, ids)
    assert.isTrue([...first, ...second].every((job) => job.attemptCount === 1))
  })

  test('expired leases are reclaimed and stale workers are fenced', async ({ assert }) => {
    const id = await seedOutbox(['tasks:list:*'])
    const repository = new PostgresCacheInvalidationOutboxRepository()
    const [firstLease] = await repository.claimBatch({
      workerId: 'cache-worker-before-crash',
      batchSize: 1,
      leaseDurationMs: 60_000,
      now: baseTime,
    })
    if (!firstLease) {
      throw new Error('Expected first cache invalidation lease')
    }

    const reclaimedAt = new Date(baseTime.getTime() + 61_000)
    const [secondLease] = await repository.claimBatch({
      workerId: 'cache-worker-after-crash',
      batchSize: 1,
      leaseDurationMs: 60_000,
      now: reclaimedAt,
    })
    if (!secondLease) {
      throw new Error('Expected reclaimed cache invalidation lease')
    }

    assert.equal(secondLease.id, id)
    assert.notEqual(secondLease.leaseToken, firstLease.leaseToken)
    assert.equal(secondLease.attemptCount, 2)
    assert.isFalse(
      await repository.acknowledge({
        jobId: id,
        leaseToken: firstLease.leaseToken,
        now: reclaimedAt,
      })
    )
    assert.isTrue(
      await repository.acknowledge({
        jobId: id,
        leaseToken: secondLease.leaseToken,
        now: reclaimedAt,
      })
    )
    const processedRow = await outboxRow(id)
    assert.equal(processedRow['status'], 'processed')
  })

  test('a new worker process resumes a persisted retry and ACKs exactly once', async ({
    assert,
  }) => {
    const id = await seedOutbox(['tasks:list:*'])
    const repository = new PostgresCacheInvalidationOutboxRepository()
    const firstWorker = new CacheInvalidationOutboxWorker({
      repository,
      invalidator: {
        deleteByPattern: () => Promise.reject(new Error('redis temporarily unavailable')),
      },
      workerId: 'cache-worker-process-one',
      now: () => baseTime,
      random: () => 0.5,
      retryBaseMs: 1_000,
    })

    const failedRun = await firstWorker.runOnce()
    assert.equal(failedRun.retried, 1)
    const retryRow = await outboxRow(id)
    assert.equal(retryRow['status'], 'pending')
    assert.equal(new Date(String(retryRow['available_at'])).getTime(), baseTime.getTime() + 1_000)

    let deletionCalls = 0
    const secondWorker = new CacheInvalidationOutboxWorker({
      repository,
      invalidator: {
        deleteByPattern: () => {
          deletionCalls += 1
          return Promise.resolve()
        },
      },
      workerId: 'cache-worker-process-two',
      now: () => new Date(baseTime.getTime() + 1_000),
    })
    const successfulRun = await secondWorker.runOnce()
    const emptyRun = await secondWorker.runOnce()

    assert.equal(successfulRun.processed, 1)
    assert.equal(emptyRun.claimed, 0)
    assert.equal(deletionCalls, 1)
    const processedRow = await outboxRow(id)
    assert.equal(processedRow['status'], 'processed')
  })

  test('reports backlog and purges only old processed rows in bounded batches', async ({
    assert,
  }) => {
    const pendingId = await seedOutbox(['tasks:list:*'])
    const oldProcessedId = await seedOutbox(['tasks:public:*'])
    const recentProcessedId = await seedOutbox(['task:metadata:*'])
    await db
      .from('cache_invalidation_outbox')
      .where('id', oldProcessedId)
      .update({
        status: 'processed',
        processed_at: new Date('2026-07-20T00:00:00.000Z'),
      })
    await db
      .from('cache_invalidation_outbox')
      .where('id', recentProcessedId)
      .update({
        status: 'processed',
        processed_at: new Date('2026-07-23T00:00:00.000Z'),
      })
    const repository = new PostgresCacheInvalidationOutboxRepository()

    const backlog = await repository.backlog()
    const purged = await repository.purgeProcessedBefore(new Date('2026-07-22T00:00:00.000Z'), 1)

    assert.isTrue(backlog.configured)
    assert.equal(backlog.pending, 1)
    assert.equal(backlog.deadLetter, 0)
    assert.equal(purged, 1)
    assert.exists(await db.from('cache_invalidation_outbox').where('id', pendingId).first())
    assert.notExists(await db.from('cache_invalidation_outbox').where('id', oldProcessedId).first())
    assert.exists(await db.from('cache_invalidation_outbox').where('id', recentProcessedId).first())
  })

  test('reports retry, lease, processed, dead-letter, and oldest-pending status', async ({
    assert,
  }) => {
    const pendingId = await seedOutbox(['tasks:list:*'], { attemptCount: 2 })
    const leasedId = await seedOutbox(['task:audit:*'])
    const processedId = await seedOutbox(['tasks:public:*'])
    const deadLetterId = await seedOutbox(['task:metadata:*'])
    await db
      .from('cache_invalidation_outbox')
      .where('id', pendingId)
      .update({ created_at: baseTime })
    await db
      .from('cache_invalidation_outbox')
      .where('id', leasedId)
      .update({
        status: 'leased',
        locked_by: 'status-test-worker',
        locked_until: new Date(baseTime.getTime() + 60_000),
        lease_token: randomUUID(),
      })
    await db
      .from('cache_invalidation_outbox')
      .where('id', processedId)
      .update({ status: 'processed', processed_at: baseTime })
    await db.from('cache_invalidation_outbox').where('id', deadLetterId).update({
      status: 'dead_letter',
      dead_lettered_at: baseTime,
      last_error_class: 'RedisTimeoutError',
    })
    const repository = new PostgresCacheInvalidationOutboxRepository()

    const status = await repository.operationalStatus(new Date(baseTime.getTime() + 5 * 60_000))

    assert.deepEqual(status, {
      configured: true,
      pending: 1,
      leased: 1,
      retryPending: 1,
      deadLetter: 1,
      processed: 1,
      oldestPendingAgeMs: 5 * 60_000,
    })
  })

  test('replays reviewed dead letters atomically with immutable operator audit', async ({
    assert,
  }) => {
    const actor = await UserFactory.createSuperadmin()
    await clearOutbox()
    const id = await seedOutbox(['tasks:list:*'], { attemptCount: 10 })
    await db.from('cache_invalidation_outbox').where('id', id).update({
      status: 'dead_letter',
      dead_lettered_at: baseTime,
      last_error_class: 'RedisTimeoutError',
      last_error_message: 'redacted outage',
    })
    const replayedAt = new Date(baseTime.getTime() + 60_000)

    const result = await replayCacheInvalidationOutboxCommand.execute(
      {
        selector: {
          ids: [id],
          errorClass: 'RedisTimeoutError',
        },
        reason: 'Redis recovered and this dead letter was reviewed.',
        now: replayedAt,
      },
      {
        userId: actor.id,
        ip: '127.0.0.1',
        userAgent: 'cache-invalidation-outbox-integration-test',
        organizationId: null,
        actorRoleSurface: actor.system_role,
        requestId: 'cache-replay-test',
        traceId: null,
        workflowId: 'cache_invalidation_outbox_replay',
      }
    )

    assert.deepEqual(result, { affectedCount: 1, outboxIds: [id] })
    const replayed = await outboxRow(id)
    assert.equal(replayed['status'], 'pending')
    assert.equal(replayed['attempt_count'], 0)
    assert.equal(new Date(String(replayed['available_at'])).getTime(), replayedAt.getTime())
    assert.isNull(replayed['dead_lettered_at'])
    assert.isNull(replayed['last_error_class'])
    assert.isNull(replayed['last_error_message'])

    const audit = (await db
      .from('audit_events')
      .where('event_name', 'cache.invalidation_outbox.replayed')
      .where('entity_id', id)
      .first()) as
      | {
          user_id: string
          action: string
          retention_class: string
          event_hash: string
          new_values: Record<string, unknown>
        }
      | undefined
    assert.exists(audit)
    assert.equal(audit?.user_id, actor.id)
    assert.equal(audit?.action, 'cache_invalidation_outbox.replayed')
    assert.equal(audit?.retention_class, 'security')
    assert.match(audit?.event_hash ?? '', /^[0-9a-f]{64}$/)
    assert.equal(audit?.new_values['reason'], 'Redis recovered and this dead letter was reviewed.')
    assert.equal(audit?.new_values['previousStatus'], 'dead_letter')
    assert.equal(audit?.new_values['resultingStatus'], 'pending')
  })
})
