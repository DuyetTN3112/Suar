import { test } from '@japa/runner'

import type { NotificationCreator } from '#actions/notifications/public_api'
import { TaskStatus } from '#constants/task_constants'
import ConflictException from '#exceptions/conflict_exception'
import AuditLog from '#infra/audit/models/audit_log'
import Task from '#infra/tasks/models/task'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { cleanupTestData } from '#tests/helpers/factories'
import TaskStatusScenario from '#tests/integration/tasks/support/task_status_scenario'

type NotificationPayload = Parameters<NotificationCreator['handle']>[0]

class NotificationSpy implements NotificationCreator {
  public calls: NotificationPayload[] = []

  public handle(data: NotificationPayload): Promise<null> {
    this.calls.push(data)
    return Promise.resolve(null)
  }
}

interface StatusTransitionCase {
  prepare: () => Promise<{
    task: Task
    targetStatusId: string
    expectedStatus: TaskStatus
  }>
}

test.group('Integration | Task Status', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('workflow status updates preserve representative transition contracts and legacy status categories', async ({
    assert,
  }) => {
    const taskScenario = await TaskStatusScenario.create()
    const scenarios: StatusTransitionCase[] = [
      {
        prepare: async () => {
          const task = await taskScenario.createTask()
          const targetStatusId = await taskScenario.statusId('in_progress')
          return { task, targetStatusId, expectedStatus: TaskStatus.IN_PROGRESS }
        },
      },
      {
        prepare: async () => {
          const task = await taskScenario.createTask()
          await taskScenario.setTaskStatus(task, 'in_progress')
          const targetStatusId = await taskScenario.statusId('done_dev')
          return { task, targetStatusId, expectedStatus: TaskStatus.IN_PROGRESS }
        },
      },
      {
        prepare: async () => {
          const task = await taskScenario.createTask()
          await taskScenario.setTaskStatus(task, 'in_testing')
          const targetStatusId = await taskScenario.statusId('done')
          return { task, targetStatusId, expectedStatus: TaskStatus.DONE }
        },
      },
      {
        prepare: async () => {
          const task = await taskScenario.createTask()
          await taskScenario.setTaskStatus(task, 'in_progress')
          const targetStatusId = await taskScenario.statusId('cancelled')
          return { task, targetStatusId, expectedStatus: TaskStatus.CANCELLED }
        },
      },
    ]

    for (const transitionCase of scenarios) {
      const { task, targetStatusId, expectedStatus } = await transitionCase.prepare()

      await taskScenario.executeStatusChange(taskScenario.ownerId, task.id, targetStatusId)

      const updated = await Task.findOrFail(task.id)
      assert.equal(updated.task_status_id, targetStatusId)
      assert.equal(updated.status, expectedStatus)
    }
  })

  test('successful status changes record updater identity and audit trail', async ({ assert }) => {
    const scenario = await TaskStatusScenario.create()
    const task = await scenario.createTask()
    const inProgressId = await scenario.statusId('in_progress')

    await scenario.executeStatusChange(scenario.ownerId, task.id, inProgressId)

    const updated = await Task.findOrFail(task.id)
    const logs = await AuditLog.find({
      entity_type: 'task',
      entity_id: task.id,
      action: 'update_status',
    })

    assert.equal(updated.updated_by, scenario.ownerId)
    assert.isAbove(logs.length, 0)
  })

  test('creator changing status does not send a notification to themself', async ({ assert }) => {
    const scenario = await TaskStatusScenario.create()
    const task = await scenario.createTask()
    const inProgressId = await scenario.statusId('in_progress')
    const notificationSpy = new NotificationSpy()

    await scenario.executeStatusChange(scenario.ownerId, task.id, inProgressId, notificationSpy)

    assert.lengthOf(notificationSpy.calls, 0)
  })

  test('status change by another authorized actor notifies the task creator', async ({
    assert,
  }) => {
    const scenario = await TaskStatusScenario.create()
    const task = await scenario.createTask()
    const admin = await scenario.createOrgAdmin()
    const inProgressId = await scenario.statusId('in_progress')
    const notificationSpy = new NotificationSpy()

    await scenario.executeStatusChange(admin.id, task.id, inProgressId, notificationSpy)

    assert.lengthOf(notificationSpy.calls, 1)
    assert.equal(notificationSpy.calls[0]?.user_id, scenario.ownerId)
    assert.equal(notificationSpy.calls[0]?.type, 'task_status_updated')
  })

  test('only permitted users can change status', async ({ assert }) => {
    const scenario = await TaskStatusScenario.create()
    const task = await scenario.createTask()
    const outsider = await scenario.createOutsider()
    const inProgressId = await scenario.statusId('in_progress')

    await assert.rejects(() => scenario.executeStatusChange(outsider.id, task.id, inProgressId))

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
    const scenario = await TaskStatusScenario.create()
    const manager = await scenario.createProjectManager()
    const task = await scenario.createTask()
    const inProgressId = await scenario.statusId('in_progress')

    await scenario.executeStatusChange(manager.id, task.id, inProgressId)

    const updated = await Task.findOrFail(task.id)
    assert.equal(updated.status, TaskStatus.IN_PROGRESS)
    assert.equal(updated.updated_by, manager.id)
  })

  test('org admins can change status of any task in their organization', async ({ assert }) => {
    const scenario = await TaskStatusScenario.create()
    const task = await scenario.createTask()
    const admin = await scenario.createOrgAdmin()
    const inProgressId = await scenario.statusId('in_progress')

    await scenario.executeStatusChange(admin.id, task.id, inProgressId)

    const updated = await Task.findOrFail(task.id)
    assert.equal(updated.status, TaskStatus.IN_PROGRESS)
  })

  test('batch status update is atomic and rolls back all tasks when one transition conflicts', async ({
    assert,
  }) => {
    const scenario = await TaskStatusScenario.create()
    const validTask = await scenario.createTask()
    const conflictingTask = await scenario.createTask({
      status: TaskStatus.DONE,
      task_status_slug: 'done',
    })
    const inProgressStatusId = await scenario.statusId('in_progress')
    const doneStatusId = await scenario.statusId('done')

    await assert.rejects(
      () =>
        scenario.executeBatchStatusChange(
          scenario.ownerId,
          [validTask.id, conflictingTask.id],
          inProgressStatusId
        ),
      ConflictException
    )

    const validTaskAfter = await Task.findOrFail(validTask.id)
    const conflictingTaskAfter = await Task.findOrFail(conflictingTask.id)

    assert.equal(validTaskAfter.task_status_id, await scenario.statusId('todo'))
    assert.equal(validTaskAfter.status, TaskStatus.TODO)
    assert.equal(conflictingTaskAfter.task_status_id, doneStatusId)
    assert.equal(conflictingTaskAfter.status, TaskStatus.DONE)
  })
})
