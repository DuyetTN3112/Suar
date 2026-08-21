import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import AuditLog from '#modules/audit/infra/models/audit-log/audit_log'
import { BusinessPolicyViolationException } from '#modules/authorization/public_contracts/policy_violation'
import ConflictException from '#modules/errors/public_contracts/conflict_exception'
import { buildNotificationEventId } from '#modules/notifications/public_contracts/notification_event_identity'
import type { TaskEventPublisher } from '#modules/tasks/actions/ports/outbound/task_event_publisher'
import type { TaskNotificationStager as NotificationStager } from '#modules/tasks/actions/ports/outbound/task_notification_stager'
import Task from '#modules/tasks/infra/models/task-authoring/task'
import { TaskStatus } from '#modules/tasks/public_contracts/task_constants'
import TaskStatusScenario from '#modules/tasks/tests/backend/support/task_status_scenario'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  cleanupTestData,
  ReviewSessionFactory,
  TaskAssignmentFactory,
} from '#tests/helpers/factories'
import { testId } from '#tests/helpers/test_utils'

type NotificationPayload = Parameters<NotificationStager['stage']>[0]

class NotificationSpy implements NotificationStager {
  public calls: NotificationPayload[] = []

  public stage(data: NotificationPayload): Promise<null> {
    this.calls.push(data)
    return Promise.resolve(null)
  }
}

class FailingNotificationStager implements NotificationStager {
  public calls = 0

  public stage(): Promise<never> {
    this.calls += 1
    return Promise.reject(new Error('task status notification staging failed'))
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

  publishTaskCreated(): Promise<void> {
    return Promise.resolve()
  }
  publishTaskUpdated(): Promise<void> {
    return Promise.resolve()
  }
  publishTaskDeleted(): Promise<void> {
    return Promise.resolve()
  }
  publishTaskAssignmentCompleted(): Promise<void> {
    return Promise.resolve()
  }
  publishTaskAssigned(): Promise<void> {
    return Promise.resolve()
  }
  publishTaskAccessRevoked(): Promise<void> {
    return Promise.resolve()
  }
  publishTaskApplicationSubmitted(): Promise<void> {
    return Promise.resolve()
  }
  publishTaskApplicationReviewed(): Promise<void> {
    return Promise.resolve()
  }

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
  group.each.teardown(async () => {
    await db.from('domain_event_outbox_replay_history').delete()
    await db.from('domain_event_outbox').delete()
    await cleanupTestData()
  })

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
          await taskScenario.createProjectManager()
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
    assert.equal(notificationSpy.calls[0]?.recipientId, scenario.ownerId)
    assert.equal(notificationSpy.calls[0]?.type, 'task_status_updated')
  })

  test('required notification staging failure rolls status and audit back', async ({ assert }) => {
    const scenario = await TaskStatusScenario.create()
    const task = await scenario.createTask()
    const manager = await scenario.createProjectManager()
    const inProgressId = await scenario.statusId('in_progress')
    const notification = new FailingNotificationStager()

    await assert.rejects(
      () => scenario.executeStatusChange(manager.id, task.id, inProgressId, notification),
      'task status notification staging failed'
    )

    const unchangedTask = await Task.findOrFail(task.id)
    const logs = await AuditLog.find({
      entity_type: 'task',
      entity_id: task.id,
      action: 'update_status',
    })

    assert.equal(notification.calls, 1)
    assert.equal(unchangedTask.task_status_id, task.task_status_id)
    assert.equal(unchangedTask.status, task.status)
    assert.lengthOf(logs, 0)
  })

  test('status transition and canonical projection intents commit together', async ({ assert }) => {
    const scenario = await TaskStatusScenario.create()
    const task = await scenario.createTask()
    const manager = await scenario.createProjectManager()
    const inProgressId = await scenario.statusId('in_progress')

    await scenario.executeStatusChange(manager.id, task.id, inProgressId)

    const updatedTask = await Task.findOrFail(task.id)
    const notification = (await db
      .from('notifications')
      .select('event_id', 'category', 'title', 'message', 'action')
      .where('user_id', scenario.ownerId)
      .where('type', 'task_status_updated')
      .where('related_entity_id', task.id)
      .first()) as {
      event_id: string
      category: string
      title: string
      message: string
      action: { routeName?: string } | null
    } | null

    assert.isNotNull(notification)
    assert.isNotNull(task.task_status_id)
    const occurredAt = updatedTask.updated_at.toUTC().toISO()
    assert.isNotNull(occurredAt)
    if (!notification || !task.task_status_id || !occurredAt) return

    assert.equal(
      notification.event_id,
      buildNotificationEventId({
        eventName: 'task.status_updated',
        businessEventId: `${task.id}:${task.task_status_id}:${inProgressId}:${occurredAt}`,
        recipientId: scenario.ownerId,
      })
    )
    assert.equal(notification.category, 'task')
    assert.equal(notification.title, 'Cập nhật trạng thái nhiệm vụ')
    assert.include(notification.message, task.title)
    assert.equal(notification.action?.routeName, 'tasks.show')
    assert.lengthOf(
      await db.from('notification_outbox').where('source_event_id', notification.event_id),
      2
    )
    const invalidation = (await db
      .from('search_projection_entity_revisions')
      .where('entity_type', 'task')
      .where('entity_id', task.id)
      .where('source_revision', occurredAt)
      .first()) as { operation?: string; changed_fields?: string[] } | undefined
    assert.equal(invalidation?.operation, 'upsert')
    assert.include(invalidation?.changed_fields ?? [], 'status')
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

  test('todo tasks cannot skip directly to done and remain unchanged', async ({ assert }) => {
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

  test('in testing tasks move to done without requiring a completion submission', async ({
    assert,
  }) => {
    const scenario = await TaskStatusScenario.create()
    const task = await scenario.createTask()
    await scenario.setTaskStatus(task, 'in_testing')
    const inTestingStatusId = await scenario.statusId('in_testing')
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

  test('in testing tasks move to done with a valid submission and write status audit', async ({
    assert,
  }) => {
    const scenario = await TaskStatusScenario.create()
    const task = await scenario.createTask()
    await scenario.createProjectManager()
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

  test('done transition commits one durable assignment event without immediate duplicate delivery', async ({
    assert,
  }) => {
    const scenario = await TaskStatusScenario.create()
    const task = await scenario.createTask()
    await scenario.createProjectManager()
    await scenario.setTaskStatus(task, 'in_testing')
    const assignment = await TaskAssignmentFactory.create({
      task_id: task.id,
      assignee_id: scenario.ownerId,
      assigned_by: scenario.ownerId,
      assignment_status: 'active',
    })
    await db.table('task_submissions').insert({
      id: testId(),
      task_assignment_id: assignment.id,
      task_id: task.id,
      submitted_by: scenario.ownerId,
      summary: 'Ready for durable completion delivery',
      status: 'submitted',
    })

    await scenario.executeStatusChange(scenario.ownerId, task.id, await scenario.statusId('done'))

    const persistedAssignment = (await db
      .from('task_assignments')
      .select('assignment_status')
      .where('id', assignment.id)
      .firstOrFail()) as { assignment_status: string }
    const completionEvents = await db
      .from('domain_event_outbox')
      .select('dedupe_key', 'status')
      .where('event_name', 'task:assignment:completed')
      .where('aggregate_id', assignment.id)
    const immediateReviewSessions = await db
      .from('review_sessions')
      .where('task_assignment_id', assignment.id)

    assert.equal(persistedAssignment.assignment_status, 'completed')
    assert.deepEqual(completionEvents, [
      {
        dedupe_key: `task-assignment-completed:${assignment.id}`,
        status: 'pending',
      },
    ])
    assert.lengthOf(immediateReviewSessions, 0)
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

  test('Docs cannot be entered or left through the task workflow', async ({ assert }) => {
    const scenario = await TaskStatusScenario.create()
    const docsTask = await scenario.createTask({ task_status_slug: 'docs' })
    const ordinaryTask = await scenario.createTask()
    const todoStatusId = await scenario.statusId('todo')
    const docsStatusId = await scenario.statusId('docs')

    await ordinaryTask.merge({ assigned_to: null }).save()

    await assert.rejects(
      () => scenario.executeStatusChange(scenario.ownerId, docsTask.id, todoStatusId),
      BusinessPolicyViolationException
    )
    await assert.rejects(
      () => scenario.executeStatusChange(scenario.ownerId, ordinaryTask.id, docsStatusId),
      BusinessPolicyViolationException
    )
    await assert.rejects(
      () =>
        scenario.executeBatchStatusChange(
          scenario.ownerId,
          [docsTask.id],
          todoStatusId
        ),
      BusinessPolicyViolationException
    )

    const persistedDocsTask = await Task.findOrFail(docsTask.id)
    const persistedOrdinaryTask = await Task.findOrFail(ordinaryTask.id)
    assert.equal(persistedDocsTask.task_status_id, docsStatusId)
    assert.equal(persistedOrdinaryTask.task_status_id, todoStatusId)
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
      organizationId: scenario.organizationId,
      assignedTo: scenario.ownerId,
      oldStatus: TaskStatus.TODO,
      newStatusId: inProgressStatusId,
      newStatus: 'in_progress',
      newStatusCategory: 'in_progress',
      changedBy: scenario.ownerId,
    })
  })
})
