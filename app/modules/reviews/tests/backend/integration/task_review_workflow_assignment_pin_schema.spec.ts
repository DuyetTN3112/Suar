import { randomUUID } from 'node:crypto'

import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  cleanupTestData,
  OrganizationFactory,
  ProjectFactory,
  TaskAssignmentFactory,
  TaskFactory,
  UserFactory,
} from '#tests/helpers/factories'

async function expectPostgresError(
  operation: () => Promise<unknown>,
  code: '23505',
  constraint: string
): Promise<void> {
  let caught: unknown
  try {
    await operation()
  } catch (error) {
    caught = error
  }
  const postgres = caught as { code?: unknown; constraint?: unknown } | null
  if (postgres?.code !== code || postgres.constraint !== constraint) {
    throw new Error(
      `Expected PostgreSQL ${code} from ${constraint}; received ${String(postgres?.code)} / ${String(postgres?.constraint)}`,
      { cause: caught }
    )
  }
}

test.group('Integration | Task review workflow assignment pin schema', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.each.teardown(() => cleanupTestData())
  group.teardown(async () => {
    await teardownApp()
  })

  test('exposes the nullable legacy pin and native uniqueness fence', async ({ assert }) => {
    const column = (await db
      .from('information_schema.columns')
      .where('table_schema', 'public')
      .where('table_name', 'task_review_workflows')
      .where('column_name', 'task_assignment_id')
      .select('is_nullable')
      .first()) as { is_nullable: string } | undefined
    const indexes = (await db
      .from('pg_indexes')
      .where('schemaname', 'public')
      .where('tablename', 'task_review_workflows')
      .whereIn('indexname', [
        'idx_task_review_workflows_assignment',
        'uq_task_review_workflows_native_assignment',
      ])
      .select('indexname')) as Array<{ indexname: string }>
    assert.equal(column?.is_nullable, 'YES')
    assert.sameMembers(
      indexes.map((index) => index.indexname),
      [
        'idx_task_review_workflows_assignment',
        'uq_task_review_workflows_native_assignment',
      ]
    )
    // Cross-entity consistency is application-owned; the database stores the pin.
    const foreignKey = await db
      .from('pg_constraint')
      .where('conname', 'fk_task_review_workflows_assignment_task')
      .select('conname')
      .first()
    assert.isNull(foreignKey)
  })

  test('stores cross-task pins and rejects duplicate native pins while preserving legacy rows', async ({
    assert,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const reviewee = await UserFactory.create()
    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
    })
    const taskA = await TaskFactory.create({
      organization_id: org.id,
      project_id: project.id,
      creator_id: owner.id,
    })
    const taskB = await TaskFactory.create({
      organization_id: org.id,
      project_id: project.id,
      creator_id: owner.id,
    })
    const assignment = await TaskAssignmentFactory.create({
      task_id: taskA.id,
      assignee_id: reviewee.id,
      assigned_by: owner.id,
      assignment_status: 'completed',
    })
    const workflow = {
      project_id: project.id,
      organization_id: org.id,
      reviewee_id: reviewee.id,
      status: 'awaiting_review',
      required_review_count: 1,
      completed_review_count: 0,
    }

    await db.table('task_review_workflows').insert({
      ...workflow,
      id: randomUUID(),
      task_id: taskA.id,
      task_assignment_id: assignment.id,
    })
    await expectPostgresError(
      () =>
        db.table('task_review_workflows').insert({
          ...workflow,
          id: randomUUID(),
          task_id: taskB.id,
          task_assignment_id: assignment.id,
        }),
      '23505',
      'uq_task_review_workflows_native_assignment'
    )

    const [legacy] = (await db
      .table('task_review_workflows')
      .insert({
        ...workflow,
        id: randomUUID(),
        task_id: taskB.id,
        task_assignment_id: null,
      })
      .returning(['id', 'task_assignment_id'])) as Array<{
      id: string
      task_assignment_id: string | null
    }>
    assert.isNull(legacy?.task_assignment_id)
  })
})
