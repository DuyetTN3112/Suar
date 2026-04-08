import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import AuditLog from '#modules/audit/infra/models/audit_log'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import ConflictException from '#modules/http/exceptions/conflict_exception'
import type { NotificationCreator } from '#modules/notifications/public_contracts/notification_creator'
import type { TaskEventPublisher } from '#modules/tasks/application/ports/task_event_publisher'
import { TaskStatus } from '#modules/tasks/constants/task_constants'
import Task from '#modules/tasks/infra/models/task'
import TaskStatusScenario from '#modules/tasks/tests/backend/support/task_status_scenario'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  cleanupTestData,
  ReviewSessionFactory,
  TaskAssignmentFactory,
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

class TaskEventPublisherSpy implements TaskEventPublisher {
  public statusChangedEvents: Array<{
    taskId: string
    assignedTo: string | null
    oldStatus: string
    newStatusId: string
    newStatus: string
    newStatusCategory: string
    changedBy: string
  }> = []

  publishTaskCreated(): Promise<void> { return Promise.resolve() }
  publishTaskUpdated(): Promise<void> { return Promise.resolve() }
  publishTaskDeleted(): Promise<void> { return Promise.resolve() }
  publishTaskAssignmentCompleted(): Promise<void> { return Promise.resolve() }
  publishTaskAssigned(): Promise<void> { return Promise.resolve() }
  publishTaskAccessRevoked(): Promise<void> { return Promise.resolve() }
  publishTaskApplicationSubmitted(): Promise<void> { return Promise.resolve() }
  publishTaskApplicationReviewed(): Promise<void> { return Promise.resolve() }

  publishTaskStatusChanged(event: {
    taskId: string
    assignedTo: string | null
    oldStatus: string
    newStatusId: string
    newStatus: string
    newStatusCategory: string
    changedBy: string
  }): Promise<void> {
    this.statusChangedEvents.push(event)
    return Promise.resolve()
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
          await db.table('task_submissions').insert({
            id: testId(),
            task_assignment_id: testId(),
            task_id: task.id,
            submitted_by: taskScenario.ownerId,
            summary: 'Ready for final acceptance',
            status: 'submitted',
          })
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
    const manager = await scenario.createProjectManager()
    const inProgressId = await scenario.statusId('in_progress')
    const notificationSpy = new NotificationSpy()

    await scenario.executeStatusChange(manager.id, task.id, inProgressId, notificationSpy)

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

  test('todo tasks cannot skip directly to done and remain unchanged', async ({
    assert,
  }) => {
    const scenario = await TaskStatusScenario.create()
    const task = await scenario.createTask()
    const doneStatusId = await scenario.statusId('done')

    await assert.rejects(() =>
      scenario.executeStatusChange(scenario.ownerId, task.id, doneStatusId)
    )

    const unchangedTask = await Task.findOrFail(task.id)
    const logs = await AuditLog.find({
      entity_type: 'task',
      entity_id: task.id,
      action: 'update_status',
    })

    assert.equal(unchangedTask.task_status_id, await scenario.statusId('todo'))
    assert.equal(unchangedTask.status, TaskStatus.TODO)
    assert.equal(logs.length, 0)
  })

  test('in testing tasks cannot move to done without a valid submission and remain unchanged', async ({
    assert,
  }) => {
    const scenario = await TaskStatusScenario.create()
    const task = await scenario.createTask()
    await scenario.setTaskStatus(task, 'in_testing')
    const inTestingStatusId = await scenario.statusId('in_testing')
    const doneStatusId = await scenario.statusId('done')

    await assert.rejects(
      () => scenario.executeStatusChange(scenario.ownerId, task.id, doneStatusId),
      BusinessLogicException,
      'Task cannot move to DONE without a valid submission (submitted, accepted_for_review, or locked)'
    )

    const unchangedTask = await Task.findOrFail(task.id)
    const logs = await AuditLog.find({
      entity_type: 'task',
      entity_id: task.id,
      action: 'update_status',
    })

    assert.equal(unchangedTask.task_status_id, inTestingStatusId)
    assert.equal(unchangedTask.status, TaskStatus.IN_PROGRESS)
    assert.equal(logs.length, 0)
  })

  test('in testing tasks move to done with a valid submission and write status audit', async ({
    assert,
  }) => {
    const scenario = await TaskStatusScenario.create()
    const task = await scenario.createTask()
    await scenario.setTaskStatus(task, 'in_testing')
    await db.table('task_submissions').insert({
      id: testId(),
      task_assignment_id: testId(),
      task_id: task.id,
      submitted_by: scenario.ownerId,
      summary: 'Ready for final acceptance',
      status: 'submitted',
    })
    const doneStatusId = await scenario.statusId('done')

    await scenario.executeStatusChange(scenario.ownerId, task.id, doneStatusId)

    const updatedTask = await Task.findOrFail(task.id)
    const logs = await AuditLog.find({
      entity_type: 'task',
      entity_id: task.id,
      action: 'update_status',
    })

    assert.equal(updatedTask.task_status_id, doneStatusId)
    assert.equal(updatedTask.status, TaskStatus.DONE)
    assert.isAbove(logs.length, 0)
  })

  test('cancelled tasks cannot reopen directly to in progress and remain unchanged', async ({
    assert,
  }) => {
    const scenario = await TaskStatusScenario.create()
    const task = await scenario.createTask({
      status: TaskStatus.CANCELLED,
      task_status_slug: 'cancelled',
    })
    const inProgressStatusId = await scenario.statusId('in_progress')

    await assert.rejects(() =>
      scenario.executeStatusChange(scenario.ownerId, task.id, inProgressStatusId)
    )

    const unchangedTask = await Task.findOrFail(task.id)
    const logs = await AuditLog.find({
      entity_type: 'task',
      entity_id: task.id,
      action: 'update_status',
    })

    assert.equal(unchangedTask.task_status_id, await scenario.statusId('cancelled'))
    assert.equal(unchangedTask.status, TaskStatus.CANCELLED)
    assert.equal(logs.length, 0)
  })

  test('reviewed done tasks cannot reopen directly to in progress and remain unchanged', async ({
    assert,
  }) => {
    const scenario = await TaskStatusScenario.create()
    const task = await scenario.createTask({
      status: TaskStatus.DONE,
      task_status_slug: 'done',
    })
    const assignment = await TaskAssignmentFactory.create({
      task_id: task.id,
      assignee_id: scenario.ownerId,
      assigned_by: scenario.ownerId,
      assignment_status: 'completed',
    })
    await ReviewSessionFactory.create({
      task_assignment_id: assignment.id,
      reviewee_id: scenario.ownerId,
      status: 'completed',
      manager_review_completed: true,
      peer_reviews_count: 1,
      required_peer_reviews: 1,
    })
    const inProgressStatusId = await scenario.statusId('in_progress')
    const doneStatusId = await scenario.statusId('done')

    await assert.rejects(() =>
      scenario.executeStatusChange(scenario.ownerId, task.id, inProgressStatusId)
    )

    const unchangedTask = await Task.findOrFail(task.id)
    const logs = await AuditLog.find({
      entity_type: 'task',
      entity_id: task.id,
      action: 'update_status',
    })

    assert.equal(unchangedTask.task_status_id, doneStatusId)
    assert.equal(unchangedTask.status, TaskStatus.DONE)
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

  test('org admins without project membership cannot change task status', async ({ assert }) => {
    const scenario = await TaskStatusScenario.create()
    const task = await scenario.createTask()
    const admin = await scenario.createOrgAdmin()
    const inProgressId = await scenario.statusId('in_progress')

    await assert.rejects(() => scenario.executeStatusChange(admin.id, task.id, inProgressId))

    const updated = await Task.findOrFail(task.id)
    assert.equal(updated.status, TaskStatus.TODO)
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

  test('batch status update publishes status-changed events through task event publisher', async ({
    assert,
  }) => {
    const scenario = await TaskStatusScenario.create()
    const task = await scenario.createTask()
    const inProgressStatusId = await scenario.statusId('in_progress')
    const taskEventPublisherSpy = new TaskEventPublisherSpy()

    await scenario.executeBatchStatusChange(
      scenario.ownerId,
      [task.id],
      inProgressStatusId,
      taskEventPublisherSpy
    )

    assert.lengthOf(taskEventPublisherSpy.statusChangedEvents, 1)
    assert.deepEqual(taskEventPublisherSpy.statusChangedEvents[0], {
      taskId: task.id,
      assignedTo: scenario.ownerId,
      oldStatus: TaskStatus.TODO,
      newStatusId: inProgressStatusId,
      newStatus: 'in_progress',
      newStatusCategory: 'in_progress',
      changedBy: scenario.ownerId,
    })
  })
})
