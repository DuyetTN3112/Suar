import { test } from '@japa/runner'

import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import UpdateTaskSortOrderCommand from '#modules/tasks/actions/commands/update_task_sort_order_command'
import { makeSystemTaskActionContext } from '#modules/tasks/actions/task_action_context'
import type { TaskEventPublisher } from '#modules/tasks/application/ports/task_event_publisher'
import { taskExternalDeps } from '#modules/tasks/bootstrap/task_composition_root'
import { TaskStatus } from '#modules/tasks/constants/task_constants'
import { TaskCacheInvalidator } from '#modules/tasks/infra/cache/task_cache_invalidator'
import Task from '#modules/tasks/infra/models/task'
import TaskStatusScenario from '#modules/tasks/tests/backend/support/task_status_scenario'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  cleanupTestData,
  ReviewSessionFactory,
  TaskAssignmentFactory,
} from '#tests/helpers/factories'

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

test.group('Integration | Task Sort Order', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('moving a task to another workflow column publishes a status-changed event through task event publisher', async ({
    assert,
  }) => {
    const scenario = await TaskStatusScenario.create()
    const task = await scenario.createTask()
    const inProgressStatusId = await scenario.statusId('in_progress')
    const taskEventPublisherSpy = new TaskEventPublisherSpy()

    const command = new UpdateTaskSortOrderCommand(
      makeSystemTaskActionContext(scenario.ownerId),
      taskExternalDeps,
      new TaskCacheInvalidator(),
      taskEventPublisherSpy
    )

    await command.execute(task.id, 7, inProgressStatusId)

    const updatedTask = await Task.findOrFail(task.id)

    assert.equal(updatedTask.sort_order, 7)
    assert.equal(updatedTask.task_status_id, inProgressStatusId)
    assert.lengthOf(taskEventPublisherSpy.statusChangedEvents, 1)
    assert.deepEqual(taskEventPublisherSpy.statusChangedEvents[0], {
      taskId: task.id,
      assignedTo: scenario.ownerId,
      oldStatus: 'todo',
      newStatusId: inProgressStatusId,
      newStatus: 'in_progress',
      newStatusCategory: 'in_progress',
      changedBy: scenario.ownerId,
    })
  })

  test('moving a completed reviewed task back to another column is rejected and leaves board state unchanged', async ({
    assert,
  }) => {
    const scenario = await TaskStatusScenario.create()
    const doneStatusId = await scenario.statusId('done')
    const inProgressStatusId = await scenario.statusId('in_progress')
    const task = await scenario.createTask({
      status: TaskStatus.DONE,
      task_status_slug: 'done',
    })
    await task.merge({ sort_order: 12 }).save()
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
    const taskEventPublisherSpy = new TaskEventPublisherSpy()

    const command = new UpdateTaskSortOrderCommand(
      makeSystemTaskActionContext(scenario.ownerId),
      taskExternalDeps,
      new TaskCacheInvalidator(),
      taskEventPublisherSpy
    )

    await assert.rejects(
      () => command.execute(task.id, 1, inProgressStatusId),
      BusinessLogicException,
      'Task đã hoàn thành và có review, không thể kéo sang trạng thái khác'
    )

    const persistedTask = await Task.findOrFail(task.id)
    assert.equal(persistedTask.sort_order, 12)
    assert.equal(persistedTask.task_status_id, doneStatusId)
    assert.equal(persistedTask.status, TaskStatus.DONE)
    assert.lengthOf(taskEventPublisherSpy.statusChangedEvents, 0)
  })
})
