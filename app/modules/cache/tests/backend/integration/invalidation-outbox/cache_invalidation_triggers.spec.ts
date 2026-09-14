import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import {
  baseTime,
  clearOutbox,
  installSchema,
  uninstallSchema,
} from './support/cache_invalidation_outbox_test_fixtures.js'

import UserProfileSnapshot from '#modules/users/infra/models/profile/user_profile_snapshot'
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


test.group('Integration | Cache invalidation transactional outbox triggers', (group) => {
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
})
