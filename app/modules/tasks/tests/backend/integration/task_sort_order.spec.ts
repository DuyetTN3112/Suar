import { test } from '@japa/runner'

import { makeCompleteTaskAssignmentsCommand } from '#composition/tasks/task-completion/task_completion_transition_composition'
import { taskExternalDeps } from '#composition/tasks/task-external-dependencies/task_external_dependencies_composition'
import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import UpdateTaskSortOrderCommand from '#modules/tasks/actions/commands/task-authoring/update_task_sort_order_command'
import type { TaskEventPublisher } from '#modules/tasks/actions/ports/outbound/task_event_publisher'
import { makeSystemTaskActionContext } from '#modules/tasks/actions/task_action_context'
import { TaskCacheInvalidator } from '#modules/tasks/infra/adapters/task-authoring/task_cache_invalidator'
import Task from '#modules/tasks/infra/models/task-authoring/task'
import TaskStatusModel from '#modules/tasks/infra/models/task-status/task_status'
import { TaskStatus } from '#modules/tasks/public_contracts/task_constants'
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
      taskEventPublisherSpy,
      makeCompleteTaskAssignmentsCommand(taskExternalDeps)
    )

    await command.execute(task.id, 7, inProgressStatusId)

    const updatedTask = await Task.findOrFail(task.id)

    assert.equal(updatedTask.sort_order, 7)
    assert.equal(updatedTask.task_status_id, inProgressStatusId)
    assert.lengthOf(taskEventPublisherSpy.statusChangedEvents, 1)
    assert.deepEqual(taskEventPublisherSpy.statusChangedEvents[0], {
      taskId: task.id,
      organizationId: scenario.organizationId,
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
      taskEventPublisherSpy,
      makeCompleteTaskAssignmentsCommand(taskExternalDeps)
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

  test('allows movement between Docs columns while keeping the legacy work status unchanged', async ({
    assert,
  }) => {
    const scenario = await TaskStatusScenario.create()
    const apiDocs = await TaskStatusModel.create({
      organization_id: scenario.organizationId,
      project_id: scenario.project.id,
      name: 'API',
      slug: 'api',
      category: 'docs',
      color: '#0EA5E9',
      sort_order: 8,
      is_default: false,
      is_system: false,
    })
    const docsTask = await scenario.createTask({
      status: TaskStatus.TODO,
      task_status_slug: 'docs',
      assigned_to: null,
    })
    const taskEventPublisherSpy = new TaskEventPublisherSpy()
    const command = new UpdateTaskSortOrderCommand(
      makeSystemTaskActionContext(scenario.ownerId),
      taskExternalDeps,
      new TaskCacheInvalidator(),
      taskEventPublisherSpy,
      makeCompleteTaskAssignmentsCommand(taskExternalDeps)
    )

    await command.execute(docsTask.id, 4, apiDocs.id)

    const updatedTask = await Task.findOrFail(docsTask.id)
    assert.equal(updatedTask.task_status_id, apiDocs.id)
    assert.equal(updatedTask.status, TaskStatus.TODO)
    assert.lengthOf(taskEventPublisherSpy.statusChangedEvents, 1)
  })
})
