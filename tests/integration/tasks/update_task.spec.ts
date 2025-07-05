import { test } from '@japa/runner'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  cleanupTestData,
  OrganizationFactory,
  OrganizationUserFactory,
  ProjectFactory,
  TaskFactory,
  UserFactory,
} from '#tests/helpers/factories'
import UpdateTaskCommand from '#actions/tasks/commands/update_task_command'
import UpdateTaskDTO from '#actions/tasks/dtos/request/update_task_dto'
import CreateNotification from '#actions/common/create_notification'
import type { ExecutionContext } from '#types/execution_context'
import Task from '#models/task'
import TaskVersion from '#models/task_version'
import { MongoAuditLogModel } from '#models/mongo/audit_log'
import ForbiddenException from '#exceptions/forbidden_exception'
import BusinessLogicException from '#exceptions/business_logic_exception'

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
    organizationId,
    ip: '127.0.0.1',
    userAgent: 'integration-test',
  }
}

async function countTaskUpdateAuditLogs(taskId: string): Promise<number> {
  const auditLogs = await MongoAuditLogModel.find({
    entity_type: 'task',
    entity_id: taskId,
    action: 'update',
  })
    .lean()
    .exec()

  return auditLogs.length
}

test.group('Integration | Update Task', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('updates task fields, creates a version snapshot, and writes audit trail', async ({
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

    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
    })
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      project_id: project.id,
      title: 'Original task title',
      description: 'Original task description',
      assigned_to: null,
      estimated_time: 2,
    })

    const command = new UpdateTaskCommand(
      buildExecutionContext(owner.id, org.id),
      new CreateNotification()
    )
    const dto = new UpdateTaskDTO({
      title: 'Updated task title',
      assigned_to: assignee.id,
      estimated_time: 5,
    })

    const updatedTask = await command.execute(task.id, dto)

    assert.equal(updatedTask.title, 'Updated task title')
    assert.equal(updatedTask.assigned_to, assignee.id)
    assert.equal(updatedTask.estimated_time, 5)

    const persistedTask = await Task.findOrFail(task.id)
    assert.equal(persistedTask.title, 'Updated task title')
    assert.equal(persistedTask.assigned_to, assignee.id)
    assert.equal(persistedTask.estimated_time, 5)

    const versionSnapshot = await TaskVersion.query().where('task_id', task.id).first()
    assert.isNotNull(versionSnapshot)
    assert.equal(versionSnapshot?.title, 'Original task title')
    assert.isNull(versionSnapshot?.assigned_to)

    const auditLogs = await MongoAuditLogModel.find({
      entity_type: 'task',
      entity_id: task.id,
      action: 'update',
    })
      .lean()
      .exec()
    assert.isAbove(auditLogs.length, 0)
  })

  test('does not create a version snapshot when only project_id changes', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const originalProject = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
    })
    const replacementProject = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
    })
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      project_id: originalProject.id,
    })

    const command = new UpdateTaskCommand(
      buildExecutionContext(owner.id, org.id),
      new CreateNotification()
    )
    const dto = new UpdateTaskDTO({
      project_id: replacementProject.id,
    })

    const updatedTask = await command.execute(task.id, dto)

    assert.equal(updatedTask.project_id, replacementProject.id)

    const versionSnapshot = await TaskVersion.query().where('task_id', task.id).first()
    assert.isNull(versionSnapshot)
  })

  test('does not send a notification when assigning the task to the updater themself', async ({
    assert,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
    })
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      project_id: project.id,
      assigned_to: null,
    })
    const notificationSpy = new NotificationSpy()

    const command = new UpdateTaskCommand(buildExecutionContext(owner.id, org.id), notificationSpy)
    const dto = new UpdateTaskDTO({
      assigned_to: owner.id,
    })

    await command.execute(task.id, dto)

    assert.lengthOf(notificationSpy.calls, 0)
  })

  test('notifies the previous assignee when the task is unassigned', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const assignee = await UserFactory.create()
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: assignee.id,
      org_role: 'org_member',
      status: 'approved',
    })
    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
    })
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      project_id: project.id,
      assigned_to: assignee.id,
    })
    const notificationSpy = new NotificationSpy()

    const command = new UpdateTaskCommand(buildExecutionContext(owner.id, org.id), notificationSpy)
    const dto = new UpdateTaskDTO({
      assigned_to: null,
    })

    await command.execute(task.id, dto)

    assert.lengthOf(notificationSpy.calls, 1)
    assert.equal(notificationSpy.calls[0]?.user_id, assignee.id)
    assert.equal(notificationSpy.calls[0]?.type, 'task_updated')
  })

  test('rejects invalid assignee updates and leaves task state unchanged', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const outsider = await UserFactory.create()
    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
    })
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      project_id: project.id,
      title: 'Unchanged task title',
      assigned_to: null,
    })

    const command = new UpdateTaskCommand(
      buildExecutionContext(owner.id, org.id),
      new CreateNotification()
    )
    const dto = new UpdateTaskDTO({
      assigned_to: outsider.id,
    })

    await assert.rejects(() => command.execute(task.id, dto), BusinessLogicException)

    const persistedTask = await Task.findOrFail(task.id)
    assert.equal(persistedTask.title, 'Unchanged task title')
    assert.isNull(persistedTask.assigned_to)

    const versionSnapshot = await TaskVersion.query().where('task_id', task.id).first()
    assert.isNull(versionSnapshot)
    assert.equal(await countTaskUpdateAuditLogs(task.id), 0)
  })

  test('rejects updates when actor lacks task field permission and leaves task untouched', async ({
    assert,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const member = await UserFactory.create()
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: member.id,
      org_role: 'org_member',
      status: 'approved',
    })
    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
    })
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      project_id: project.id,
      title: 'Permission Locked Task',
    })

    const command = new UpdateTaskCommand(
      buildExecutionContext(member.id, org.id),
      new CreateNotification()
    )
    const dto = new UpdateTaskDTO({
      title: 'Should Not Persist',
    })

    await assert.rejects(() => command.execute(task.id, dto), ForbiddenException)

    const persistedTask = await Task.findOrFail(task.id)
    assert.equal(persistedTask.title, 'Permission Locked Task')
    assert.isNull(await TaskVersion.query().where('task_id', task.id).first())
    assert.equal(await countTaskUpdateAuditLogs(task.id), 0)
  })

  test('rejects updates when current organization context does not match the task', async ({
    assert,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const { org: otherOrg } = await OrganizationFactory.createWithOwner()
    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
    })
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      project_id: project.id,
    })

    const command = new UpdateTaskCommand(
      buildExecutionContext(owner.id, otherOrg.id),
      new CreateNotification()
    )
    const dto = new UpdateTaskDTO({
      title: 'Should be rejected',
    })

    await assert.rejects(() => command.execute(task.id, dto), ForbiddenException)

    const persistedTask = await Task.findOrFail(task.id)
    assert.notEqual(persistedTask.title, 'Should be rejected')
    assert.isNull(await TaskVersion.query().where('task_id', task.id).first())
    assert.equal(await countTaskUpdateAuditLogs(task.id), 0)
  })
})
