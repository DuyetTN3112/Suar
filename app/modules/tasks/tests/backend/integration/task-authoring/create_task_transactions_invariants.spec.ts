import crypto from 'node:crypto'

import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import ConflictException from '#modules/errors/public_contracts/conflict_exception'
import { buildNotificationEventId } from '#modules/notifications/public_contracts/notification_event_identity'
import Project from '#modules/projects/infra/models/project-context/project'
import Task from '#modules/tasks/infra/models/task-authoring/task'
import CreateTaskScenario from '#modules/tasks/tests/backend/support/task-authoring/create_task_scenario'
import {
  cleanupTaskCreationTestData,
  FailingNotificationStager,
  setupTaskCreationTestGroup,
  teardownTaskCreationTestGroup,
} from '#modules/tasks/tests/backend/support/task-authoring/create_task_test_support'

test.group('Integration | Create Task - Transactions and Invariants', (group) => {
  group.setup(() => setupTaskCreationTestGroup())
  group.teardown(() => teardownTaskCreationTestGroup())
  group.each.teardown(() => cleanupTaskCreationTestData())

  test('rolls back the Task, audit, and idempotency fence when initial authoring revision is stale', async ({
    assert,
  }) => {
    const scenario = await CreateTaskScenario.build()
    const title = 'Stale initial authoring Task'
    const idempotencyKey = `draft:stale:${crypto.randomUUID()}`

    await assert.rejects(
      () =>
        scenario.create({
          title,
          description: '',
          acceptance_criteria: '',
          required_skill_ids: [],
          authoring: {
            mode: 'operational_only',
            intent: 'save_draft',
            idempotency_key: idempotencyKey,
            expected_head_revision: 1,
            creator_confirmed: false,
          },
        }),
      ConflictException
    )

    assert.isNull(
      await Task.query()
        .where('organization_id', scenario.organizationId)
        .where('title', title)
        .first()
    )
    assert.isNull(
      (await db
        .from('task_authoring_idempotency_keys')
        .where('organization_id', scenario.organizationId)
        .where('idempotency_key', idempotencyKey)
        .first()) as unknown
    )
  })

  test('task organization_id stays aligned with the owning project organization as a denormalized invariant', async ({
    assert,
  }) => {
    const scenario = await CreateTaskScenario.build()
    const task = await scenario.create({
      title: 'Org Task',
    })
    const project = await Project.findOrFail(task.project_id)

    assert.equal(project.organization_id, scenario.organizationId)
    assert.equal(task.organization_id, project.organization_id)
  })

  test('creates audit log after task creation', async ({ assert }) => {
    const scenario = await CreateTaskScenario.build()
    const task = await scenario.create({
      title: 'Audited Task',
    })

    const logs = await db
      .from('audit_events')
      .where('entity_type', 'task')
      .where('entity_id', task.id)
      .where('action', 'create')

    assert.isAbove(logs.length, 0)
  })

  test('required assignment notification staging failure rolls task and audit back', async ({
    assert,
  }) => {
    const scenario = await CreateTaskScenario.build()
    const assignee = await scenario.createOrgMember()
    const notification = new FailingNotificationStager()
    const title = 'Atomic assigned task'

    await assert.rejects(
      () =>
        scenario.createWithNotificationStager(
          {
            title,
            assigned_to: assignee.id,
          },
          notification
        ),
      'task creation notification staging failed'
    )

    const task = await Task.query()
      .where('organization_id', scenario.organizationId)
      .where('title', title)
      .first()
    const audit = notification.taskId
      ? ((await db
          .from('audit_events')
          .where('entity_type', 'task')
          .where('entity_id', notification.taskId)
          .where('action', 'create')
          .first()) as unknown)
      : null

    assert.equal(notification.calls, 1)
    assert.isNotNull(notification.taskId)
    assert.isNull(task)
    assert.isNull(audit)
  })

  test('assigned task and canonical projection intents commit together', async ({ assert }) => {
    const scenario = await CreateTaskScenario.build()
    const assignee = await scenario.createOrgMember()

    const task = await scenario.create({
      title: 'Canonical assigned task',
      assigned_to: assignee.id,
    })

    const notification = (await db
      .from('notifications')
      .select('event_id', 'category', 'title', 'message', 'action')
      .where('user_id', assignee.id)
      .where('type', 'task_assigned')
      .where('related_entity_id', task.id)
      .first()) as {
      event_id: string
      category: string
      title: string
      message: string
      action: { routeName?: string } | null
    } | null

    assert.isNotNull(notification)
    if (!notification) return
    assert.equal(
      notification.event_id,
      buildNotificationEventId({
        eventName: 'task.created_assigned',
        businessEventId: task.id,
        recipientId: assignee.id,
      })
    )
    assert.equal(notification.category, 'task')
    assert.equal(notification.title, 'Bạn có nhiệm vụ mới')
    assert.include(notification.message, task.title)
    assert.equal(notification.action?.routeName, 'tasks.show')
    assert.lengthOf(
      await db.from('notification_outbox').where('source_event_id', notification.event_id),
      2
    )
  })
})
