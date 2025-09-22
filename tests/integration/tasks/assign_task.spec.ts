import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import NotFoundException from '#modules/http/exceptions/not_found_exception'
import { notificationPublicApi, type NotificationCreator } from '#modules/notifications/public_contracts/notification_creator'
import AssignTaskCommand from '#modules/tasks/actions/commands/assign_task_command'
import AssignTaskDTO from '#modules/tasks/actions/dtos/request/assign_task_dto'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import { taskExternalDeps } from '#modules/tasks/bootstrap/task_composition_root'
import { TaskCacheInvalidator } from '#modules/tasks/infra/cache/task_cache_invalidator'
import Task from '#modules/tasks/infra/models/task'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  cleanupTestData,
  OrganizationFactory,
  OrganizationUserFactory,
  TaskFactory,
  UserFactory,
} from '#tests/helpers/factories'
import { testId } from '#tests/helpers/test_utils'

type NotificationPayload = Parameters<NotificationCreator['handle']>[0]

class NotificationSpy implements NotificationCreator {
  public calls: NotificationPayload[] = []

  public handle(data: NotificationPayload): Promise<null> {
    this.calls.push(data)
    return Promise.resolve(null)
  }
}

function buildActionContext(userId: string, organizationId: string): TaskActionContext {
  return {
    userId,
    ip: '127.0.0.1',
    userAgent: 'integration-test',
    organizationId,
  }
}

async function countTaskAuditLogs(taskId: string, action: string): Promise<number> {
  const result = (await db.from('audit_events')
    .where('entity_type', 'task')
    .where('entity_id', taskId)
    .where('action', action)
    .count('* as count')) as { count: number | string }[]
  return Number(result[0]?.count ?? 0)
}

test.group('Integration | Assign Task', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('assigns a task to an org member, records audit, and notifies the assignee', async ({
    assert,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const assignee = await UserFactory.create()
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: assignee.id,
      org_role: 'org_member',
      status: 'approved',
    })
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      assigned_to: null,
    })
    const notificationSpy = new NotificationSpy()
    const command = new AssignTaskCommand(
      buildActionContext(owner.id, org.id),
      notificationSpy,
      taskExternalDeps,
      new TaskCacheInvalidator()
    )
    const dto = new AssignTaskDTO({
      task_id: task.id,
      assigned_to: assignee.id,
    })

    const updatedTask = await command.execute(dto)

    const persistedTask = await Task.findOrFail(task.id)

    assert.equal(updatedTask.assigned_to, assignee.id)
    assert.equal(persistedTask.assigned_to, assignee.id)
    assert.equal(persistedTask.updated_by, owner.id)
    assert.equal(await countTaskAuditLogs(task.id, 'assign'), 1)
    assert.lengthOf(notificationSpy.calls, 1)
    assert.equal(notificationSpy.calls[0]?.user_id, assignee.id)
    assert.equal(notificationSpy.calls[0]?.type, 'task_assigned')
  })

  test('reassigning a task notifies the new assignee and the previous assignee', async ({
    assert,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const currentAssignee = await UserFactory.create()
    const newAssignee = await UserFactory.create()

    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: currentAssignee.id,
      org_role: 'org_member',
      status: 'approved',
    })
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: newAssignee.id,
      org_role: 'org_member',
      status: 'approved',
    })

    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      assigned_to: currentAssignee.id,
    })

    const notificationSpy = new NotificationSpy()
    const command = new AssignTaskCommand(
      buildActionContext(owner.id, org.id),
      notificationSpy,
      taskExternalDeps,
      new TaskCacheInvalidator()
    )
    const dto = new AssignTaskDTO({
      task_id: task.id,
      assigned_to: newAssignee.id,
    })

    await command.execute(dto)

    const persistedTask = await Task.findOrFail(task.id)

    assert.equal(persistedTask.assigned_to, newAssignee.id)
    assert.equal(await countTaskAuditLogs(task.id, 'assign'), 1)
    assert.lengthOf(notificationSpy.calls, 2)
    assert.equal(notificationSpy.calls[0]?.user_id, newAssignee.id)
    assert.equal(notificationSpy.calls[0]?.type, 'task_assigned')
    assert.equal(notificationSpy.calls[1]?.user_id, currentAssignee.id)
    assert.equal(notificationSpy.calls[1]?.type, 'task_reassigned')
  })

  test('unassigning a task clears the assignee and notifies the previous assignee', async ({
    assert,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const assignee = await UserFactory.create()
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: assignee.id,
      org_role: 'org_member',
      status: 'approved',
    })

    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      assigned_to: assignee.id,
    })

    const notificationSpy = new NotificationSpy()
    const command = new AssignTaskCommand(
      buildActionContext(owner.id, org.id),
      notificationSpy,
      taskExternalDeps,
      new TaskCacheInvalidator()
    )
    const dto = new AssignTaskDTO({
      task_id: task.id,
      assigned_to: null,
    })

    await command.execute(dto)

    const persistedTask = await Task.findOrFail(task.id)

    assert.isNull(persistedTask.assigned_to)
    assert.equal(await countTaskAuditLogs(task.id, 'unassign'), 1)
    assert.lengthOf(notificationSpy.calls, 1)
    assert.equal(notificationSpy.calls[0]?.user_id, assignee.id)
    assert.equal(notificationSpy.calls[0]?.type, 'task_unassigned')
  })

  test('rejects missing assignees and leaves the task unchanged', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      assigned_to: null,
    })

    const command = new AssignTaskCommand(
      buildActionContext(owner.id, org.id),
      notificationPublicApi,
      taskExternalDeps,
      new TaskCacheInvalidator()
    )
    const dto = new AssignTaskDTO({
      task_id: task.id,
      assigned_to: testId(),
    })

    await assert.rejects(() => command.execute(dto), NotFoundException)

    const persistedTask = await Task.findOrFail(task.id)
    assert.isNull(persistedTask.assigned_to)
    assert.equal(await countTaskAuditLogs(task.id, 'assign'), 0)
  })

  test('rejects assignees outside the organization and leaves the task unchanged', async ({
    assert,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const outsider = await UserFactory.create()
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      assigned_to: null,
    })

    const command = new AssignTaskCommand(
      buildActionContext(owner.id, org.id),
      notificationPublicApi,
      taskExternalDeps,
      new TaskCacheInvalidator()
    )
    const dto = new AssignTaskDTO({
      task_id: task.id,
      assigned_to: outsider.id,
    })

    await assert.rejects(() => command.execute(dto), BusinessLogicException)

    const persistedTask = await Task.findOrFail(task.id)
    assert.isNull(persistedTask.assigned_to)
    assert.equal(await countTaskAuditLogs(task.id, 'assign'), 0)
  })
})
