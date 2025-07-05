import { test } from '@japa/runner'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  UserFactory,
  OrganizationFactory,
  OrganizationUserFactory,
  ProjectFactory,
  ProjectMemberFactory,
  TaskFactory,
  cleanupTestData,
} from '#tests/helpers/factories'
import UpdateTaskStatusCommand from '#actions/tasks/commands/update_task_status_command'
import BatchUpdateTaskStatusCommand from '#actions/tasks/commands/batch_update_task_status_command'
import UpdateTaskStatusDTO from '#actions/tasks/dtos/request/update_task_status_dto'
import CreateNotification from '#actions/common/create_notification'
import Task from '#models/task'
import TaskStatusModel from '#models/task_status'
import AuditLog from '#models/mongo/audit_log'
import { ExecutionContext } from '#types/execution_context'
import { TaskStatus } from '#constants/task_constants'
import { seedDefaultTaskStatuses } from '#actions/tasks/commands/seed_default_task_statuses'
import db from '@adonisjs/lucid/services/db'
import ConflictException from '#exceptions/conflict_exception'

type NotificationPayload = Parameters<CreateNotification['handle']>[0]

class NotificationSpy extends CreateNotification {
  public calls: NotificationPayload[] = []

  public override handle(data: NotificationPayload): Promise<null> {
    this.calls.push(data)
    return Promise.resolve(null)
  }
}

test.group('Integration | Task Status', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  async function seedTaskWorkflow(organizationId: string): Promise<void> {
    const trx = await db.transaction()
    try {
      await seedDefaultTaskStatuses(organizationId, trx)
      await trx.commit()
    } catch {
      await trx.rollback()
      throw new Error('Failed to seed task statuses')
    }
  }

  async function getStatusId(orgId: string, slug: string): Promise<string> {
    const status = await TaskStatusModel.query()
      .where('organization_id', orgId)
      .where('slug', slug)
      .whereNull('deleted_at')
      .firstOrFail()
    return status.id
  }

  async function createTaskInOrg() {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    await seedTaskWorkflow(org.id)
    const todoStatusId = await getStatusId(org.id, 'todo')
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      status: TaskStatus.TODO,
      assigned_to: owner.id,
      task_status_id: todoStatusId,
    })
    return { org, owner, task }
  }

  async function executeStatusChange(actorId: string, taskId: string, statusId: string) {
    const ctx = ExecutionContext.system(actorId)
    const command = new UpdateTaskStatusCommand(ctx, new CreateNotification())
    return command.execute(
      new UpdateTaskStatusDTO({
        task_id: taskId,
        task_status_id: statusId,
      })
    )
  }

  async function executeStatusChangeWithNotificationSpy(
    actorId: string,
    taskId: string,
    statusId: string,
    notificationSpy: NotificationSpy
  ) {
    const ctx = ExecutionContext.system(actorId)
    const command = new UpdateTaskStatusCommand(ctx, notificationSpy)
    return command.execute(
      new UpdateTaskStatusDTO({
        task_id: taskId,
        task_status_id: statusId,
      })
    )
  }

  test('workflow status updates preserve representative transition contracts and legacy status categories', async ({
    assert,
  }) => {
    const scenarios = [
      {
        prepare: async (orgId: string) => {
          const targetStatusId = await getStatusId(orgId, 'in_progress')
          return { targetStatusId, expectedStatus: TaskStatus.IN_PROGRESS }
        },
      },
      {
        prepare: async (orgId: string, task: Task) => {
          const inProgressId = await getStatusId(orgId, 'in_progress')
          await task.merge({ status: TaskStatus.IN_PROGRESS, task_status_id: inProgressId }).save()
          const targetStatusId = await getStatusId(orgId, 'done_dev')
          return { targetStatusId, expectedStatus: TaskStatus.IN_PROGRESS }
        },
      },
      {
        prepare: async (orgId: string, task: Task) => {
          const inTestingId = await getStatusId(orgId, 'in_testing')
          await task.merge({ status: TaskStatus.IN_PROGRESS, task_status_id: inTestingId }).save()
          const targetStatusId = await getStatusId(orgId, 'done')
          return { targetStatusId, expectedStatus: TaskStatus.DONE }
        },
      },
      {
        prepare: async (orgId: string, task: Task) => {
          const inProgressId = await getStatusId(orgId, 'in_progress')
          await task.merge({ status: TaskStatus.IN_PROGRESS, task_status_id: inProgressId }).save()
          const targetStatusId = await getStatusId(orgId, 'cancelled')
          return { targetStatusId, expectedStatus: TaskStatus.CANCELLED }
        },
      },
    ]

    for (const scenario of scenarios) {
      const { org, owner, task } = await createTaskInOrg()
      const { targetStatusId, expectedStatus } = await scenario.prepare(org.id, task)

      await executeStatusChange(owner.id, task.id, targetStatusId)

      const updated = await Task.findOrFail(task.id)
      assert.equal(updated.task_status_id, targetStatusId)
      assert.equal(updated.status, expectedStatus)
    }
  })

  test('successful status changes record updater identity and audit trail', async ({ assert }) => {
    const { org, owner, task } = await createTaskInOrg()
    const inProgressId = await getStatusId(org.id, 'in_progress')

    await executeStatusChange(owner.id, task.id, inProgressId)

    const updated = await Task.findOrFail(task.id)
    const logs = await AuditLog.find({
      entity_type: 'task',
      entity_id: task.id,
      action: 'update_status',
    })

    assert.equal(updated.updated_by, owner.id)
    assert.isAbove(logs.length, 0)
  })

  test('creator changing status does not send a notification to themself', async ({ assert }) => {
    const { org, owner, task } = await createTaskInOrg()
    const inProgressId = await getStatusId(org.id, 'in_progress')
    const notificationSpy = new NotificationSpy()

    await executeStatusChangeWithNotificationSpy(owner.id, task.id, inProgressId, notificationSpy)

    assert.lengthOf(notificationSpy.calls, 0)
  })

  test('status change by another authorized actor notifies the task creator', async ({
    assert,
  }) => {
    const { org, owner, task } = await createTaskInOrg()
    const admin = await UserFactory.create()
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: admin.id,
      org_role: 'org_admin',
      status: 'approved',
    })
    const inProgressId = await getStatusId(org.id, 'in_progress')
    const notificationSpy = new NotificationSpy()

    await executeStatusChangeWithNotificationSpy(admin.id, task.id, inProgressId, notificationSpy)

    assert.lengthOf(notificationSpy.calls, 1)
    assert.equal(notificationSpy.calls[0]?.user_id, owner.id)
    assert.equal(notificationSpy.calls[0]?.type, 'task_status_updated')
  })

  test('only permitted users can change status', async ({ assert }) => {
    const { org, task } = await createTaskInOrg()
    const outsider = await UserFactory.create()
    const inProgressId = await getStatusId(org.id, 'in_progress')

    await assert.rejects(() => executeStatusChange(outsider.id, task.id, inProgressId))

    const unchangedTask = await Task.findOrFail(task.id)
    const logs = await AuditLog.find({
      entity_type: 'task',
      entity_id: task.id,
      action: 'update_status',
    })

    assert.equal(unchangedTask.task_status_id, task.task_status_id)
    assert.equal(unchangedTask.status, task.status)
    assert.equal(logs.length, 0)
  })

  test('project managers can change status for tasks inside their project', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const manager = await UserFactory.create()
    await seedTaskWorkflow(org.id)
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: manager.id,
      org_role: 'org_member',
      status: 'approved',
    })

    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
    })
    await ProjectMemberFactory.create({
      project_id: project.id,
      user_id: manager.id,
      project_role: 'project_manager',
    })

    const todoStatusId = await getStatusId(org.id, 'todo')
    const inProgressId = await getStatusId(org.id, 'in_progress')
    const task = await TaskFactory.create({
      creator_id: owner.id,
      project_id: project.id,
      assigned_to: owner.id,
      status: TaskStatus.TODO,
      task_status_id: todoStatusId,
    })

    await executeStatusChange(manager.id, task.id, inProgressId)

    const updated = await Task.findOrFail(task.id)
    assert.equal(updated.status, TaskStatus.IN_PROGRESS)
    assert.equal(updated.updated_by, manager.id)
  })

  test('org admins can change status of any task in their organization', async ({ assert }) => {
    const { org, task } = await createTaskInOrg()
    const admin = await UserFactory.create()
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: admin.id,
      org_role: 'org_admin',
      status: 'approved',
    })
    const inProgressId = await getStatusId(org.id, 'in_progress')

    await executeStatusChange(admin.id, task.id, inProgressId)

    const updated = await Task.findOrFail(task.id)
    assert.equal(updated.status, TaskStatus.IN_PROGRESS)
  })

  test('batch status update is atomic and rolls back all tasks when one transition conflicts', async ({
    assert,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    await seedTaskWorkflow(org.id)

    const todoStatusId = await getStatusId(org.id, 'todo')
    const inProgressStatusId = await getStatusId(org.id, 'in_progress')
    const doneStatusId = await getStatusId(org.id, 'done')

    const validTask = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      status: TaskStatus.TODO,
      task_status_id: todoStatusId,
      assigned_to: owner.id,
    })

    const conflictingTask = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      status: TaskStatus.DONE,
      task_status_id: doneStatusId,
      assigned_to: owner.id,
    })

    const command = new BatchUpdateTaskStatusCommand(ExecutionContext.system(owner.id))

    await assert.rejects(
      () => command.execute([validTask.id, conflictingTask.id], inProgressStatusId, org.id),
      ConflictException
    )

    const validTaskAfter = await Task.findOrFail(validTask.id)
    const conflictingTaskAfter = await Task.findOrFail(conflictingTask.id)

    assert.equal(validTaskAfter.task_status_id, todoStatusId)
    assert.equal(validTaskAfter.status, TaskStatus.TODO)
    assert.equal(conflictingTaskAfter.task_status_id, doneStatusId)
    assert.equal(conflictingTaskAfter.status, TaskStatus.DONE)
  })
})
