import crypto from 'node:crypto'

import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import {
  BusinessPolicyViolationException,
  ForbiddenPolicyViolationException,
} from '#modules/authorization/public_contracts/policy_violation'
import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { buildNotificationEventId } from '#modules/notifications/public_contracts/notification_event_identity'
import Project from '#modules/projects/infra/models/project'
import type { TaskNotificationStager as NotificationStager } from '#modules/tasks/actions/ports/outbound/task_notification_stager'
import Task from '#modules/tasks/infra/models/task'
import { TaskStatus } from '#modules/tasks/public_contracts/task_constants'
import CreateTaskScenario from '#modules/tasks/tests/backend/support/create_task_scenario'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { cleanupTestData } from '#tests/helpers/factories'

class FailingNotificationStager implements NotificationStager {
  public calls = 0
  public taskId: string | null = null

  public stage(command: Parameters<NotificationStager['stage']>[0]): Promise<never> {
    this.calls += 1
    this.taskId = command.subject?.id ?? null
    return Promise.reject(new Error('task creation notification staging failed'))
  }
}

async function checkTaskV5Schema(): Promise<boolean> {
  const rawResult: unknown = await db
    .from('information_schema.columns')
    .where('table_name', 'tasks')
    .whereIn('column_name', ['acceptance_criteria', 'verification_method'])
    .count('* as total')
    .first()

  const result = rawResult as { total?: number | string } | null
  const total = Number(result?.total ?? 0)
  return total >= 2
}

test.group('Integration | Create Task', (group) => {
  group.setup(async () => {
    await setupApp()
    const hasTaskV5Schema = await checkTaskV5Schema()
    if (!hasTaskV5Schema) {
      throw new Error(
        'Task integration tests require the current task schema with acceptance_criteria and verification_method columns'
      )
    }
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('creates task successfully with valid data', async ({ assert }) => {
    const scenario = await CreateTaskScenario.build()
    const task = await scenario.create({
      title: 'Test Task Title',
      description: 'Test description',
    })

    assert.isNotNull(task)
    assert.equal(task.title, 'Test Task Title')
    assert.equal(task.status, TaskStatus.TODO)
    assert.equal(task.task_status_id, scenario.todoStatusId)
    assert.equal(task.creator_id, scenario.ownerId)

    const dbTask = await Task.find(task.id)
    assert.isNotNull(dbTask)
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

    const logs = await db.from('audit_events')
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
      .first()) as
      | {
          event_id: string
          category: string
          title: string
          message: string
          action: { routeName?: string } | null
        }
      | null

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

  test('throws when user is not active', async ({ assert }) => {
    const scenario = await CreateTaskScenario.build()
    const inactiveUser = await scenario.createInactiveUser()

    await assert.rejects(
      () =>
        scenario.createAs(inactiveUser.id, {
          title: 'Should Fail',
        }),
      NotFoundException
    )
  })

  test('throws when user has no permission to create task', async ({ assert }) => {
    const scenario = await CreateTaskScenario.build()
    const outsider = await scenario.createOutsider()

    await assert.rejects(
      () =>
        scenario.createAs(outsider.id, {
          title: 'Should Fail',
        }),
      ForbiddenPolicyViolationException
    )
  })

  test('throws when project does not belong to org', async ({ assert }) => {
    const scenario = await CreateTaskScenario.build()
    const project = await scenario.createForeignProject()

    await assert.rejects(
      () =>
        scenario.create({
          title: 'Should Fail',
          project_id: project.id,
        }),
      BusinessLogicException
    )
  })

  test('rejects unknown project id and leaves task table unchanged', async ({ assert }) => {
    const scenario = await CreateTaskScenario.build()
    const title = 'Unknown Project Task'

    await assert.rejects(
      () =>
        scenario.create({
          title,
          project_id: crypto.randomUUID(),
        }),
      NotFoundException
    )

    const persistedTask = await Task.query()
      .where('title', title)
      .whereNull('deleted_at')
      .first()

    assert.isNull(persistedTask)
  })

  test('assignee must be org member', async ({ assert }) => {
    const scenario = await CreateTaskScenario.build()
    const outsider = await scenario.createOutsider()

    await assert.rejects(
      () =>
        scenario.create({
          title: 'Invalid Assignee',
          assigned_to: outsider.id,
        }),
      BusinessPolicyViolationException
    )
  })

  test('rejects unknown assignee id and leaves task table unchanged', async ({ assert }) => {
    const scenario = await CreateTaskScenario.build()
    const title = 'Unknown Assignee Task'

    await assert.rejects(
      () =>
        scenario.create({
          title,
          assigned_to: crypto.randomUUID(),
        }),
      BusinessPolicyViolationException
    )

    const persistedTask = await Task.query()
      .where('title', title)
      .whereNull('deleted_at')
      .first()

    assert.isNull(persistedTask)
  })

  test('allows assigning a external_contributor outside the organization', async ({ assert }) => {
    const scenario = await CreateTaskScenario.build()
    const externalContributor = await scenario.createExternalContributor()
    const task = await scenario.create({
      title: 'ExternalContributor Assignee Task',
      assigned_to: externalContributor.id,
      task_visibility: 'external',
    })

    assert.equal(task.assigned_to, externalContributor.id)
  })

  test('rolls back task creation if required skill validation fails after task insert', async ({
    assert,
  }) => {
    const scenario = await CreateTaskScenario.build()
    const title = 'Rollback Required Skill Task'
    const inactiveSkill = await scenario.createInactiveSkill()

    await assert.rejects(
      () =>
        scenario.create({
          title,
          required_skill_id: inactiveSkill.id,
        }),
      BusinessLogicException
    )

    const rolledBackTask = await Task.query()
      .where('project_id', scenario.project.id)
      .where('title', title)
      .whereNull('deleted_at')
      .first()

    assert.isNull(rolledBackTask)
  })

  test('parent task from another organization is rejected', async ({ assert }) => {
    const scenario = await CreateTaskScenario.build()
    const parentTask = await scenario.createForeignParentTask()

    await assert.rejects(
      () =>
        scenario.create({
          title: 'Child Task',
          parent_task_id: parentTask.id,
        }),
      NotFoundException
    )
  })

  test('rejects creating a task with a past due date and leaves task table unchanged', async ({
    assert,
  }) => {
    const scenario = await CreateTaskScenario.build()
    const title = 'Past Due Date Task'

    await assert.rejects(
      () =>
        scenario.create({
          title,
          due_date: '2020-01-01',
        }),
      BusinessPolicyViolationException
    )

    const persistedTask = await Task.query()
      .where('title', title)
      .whereNull('deleted_at')
      .first()

    assert.isNull(persistedTask)
  })

  test('rejects overlong descriptions and leaves task table unchanged', async ({
    assert,
  }) => {
    const scenario = await CreateTaskScenario.build()
    const title = 'Overlong Description Task'

    await assert.rejects(
      () =>
        scenario.create({
          title,
          description: 'D'.repeat(5001),
        }),
      ValidationException
    )

    const persistedTask = await Task.query()
      .where('title', title)
      .whereNull('deleted_at')
      .first()

    assert.isNull(persistedTask)
  })

  test('rejects invalid create enum values and leaves task table unchanged', async ({
    assert,
  }) => {
    const scenario = await CreateTaskScenario.build()
    const invalidEnumCases = [
      {
        title: 'Invalid Task Type Task',
        overrides: { task_type: 'fake_task_type' },
      },
      {
        title: 'Invalid Task Visibility Task',
        overrides: { task_visibility: 'fake_visibility' },
      },
    ] as const

    for (const invalidEnumCase of invalidEnumCases) {
      await assert.rejects(
        () =>
          scenario.create({
            title: invalidEnumCase.title,
            ...invalidEnumCase.overrides,
          }),
        ValidationException
      )

      const persistedTask = await Task.query()
        .where('title', invalidEnumCase.title)
        .whereNull('deleted_at')
        .first()

      assert.isNull(persistedTask)
    }
  })

  test('project manager can create task in their project', async ({ assert }) => {
    const scenario = await CreateTaskScenario.build()
    const manager = await scenario.createProjectManager()

    const task = await scenario.createAs(manager.id, {
      title: 'Manager Task',
    })

    assert.equal(task.project_id, scenario.project.id)
  })

  test('superadmin cannot create task without organization or project membership', async ({
    assert,
  }) => {
    const scenario = await CreateTaskScenario.build()
    const superadmin = await scenario.createSuperadmin()

    await assert.rejects(
      () =>
        scenario.createAs(superadmin.id, {
          title: 'Superadmin Task',
        }),
      ForbiddenPolicyViolationException
    )
  })
})
