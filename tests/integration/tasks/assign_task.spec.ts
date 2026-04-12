import { test } from '@japa/runner'

import CreateNotification from '#actions/common/create_notification'
import AssignTaskCommand from '#actions/tasks/commands/assign_task_command'
import AssignTaskDTO from '#actions/tasks/dtos/request/assign_task_dto'
import BusinessLogicException from '#exceptions/business_logic_exception'
import NotFoundException from '#exceptions/not_found_exception'
import { MongoAuditLogModel } from '#models/mongo/audit_log'
import Task from '#models/task'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  cleanupTestData,
  OrganizationFactory,
  OrganizationUserFactory,
  TaskFactory,
  UserFactory,
} from '#tests/helpers/factories'
import { testId } from '#tests/helpers/test_utils'
import type { ExecutionContext } from '#types/execution_context'

type NotificationPayload = Parameters<CreateNotification['handle']>[0]

class NotificationSpy extends CreateNotification {
  public calls: NotificationPayload[] = []

  public override handle(data: NotificationPayload): Promise<null> {
    this.calls.push(data)
    return Promise.resolve(null)
  }
}

function buildExecutionContext(userId: string, organizationId: string): ExecutionContext {
  return {
    userId,
    ip: '127.0.0.1',
    userAgent: 'integration-test',
    organizationId,
  }
}

async function countTaskAuditLogs(taskId: string, action: string): Promise<number> {
  return await MongoAuditLogModel.countDocuments({
    entity_type: 'task',
    entity_id: taskId,
    action,
  })
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
    const command = new AssignTaskCommand(buildExecutionContext(owner.id, org.id), notificationSpy)
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
    const command = new AssignTaskCommand(buildExecutionContext(owner.id, org.id), notificationSpy)
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
    const command = new AssignTaskCommand(buildExecutionContext(owner.id, org.id), notificationSpy)
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
      buildExecutionContext(owner.id, org.id),
      new CreateNotification()
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
      buildExecutionContext(owner.id, org.id),
      new CreateNotification()
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
