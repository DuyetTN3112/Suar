import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import { taskExternalDeps } from '#composition/task_external_dependencies_composition'
import UpdateTaskTimeCommand from '#modules/tasks/actions/commands/update_task_time_command'
import UpdateTaskTimeDTO from '#modules/tasks/actions/dtos/request/update_task_time_dto'
import type { TaskEventPublisher } from '#modules/tasks/actions/ports/outbound/task_event_publisher'
import { makeSystemTaskActionContext } from '#modules/tasks/actions/task_action_context'
import { TaskCacheInvalidator } from '#modules/tasks/infra/cache/task_cache_invalidator'
import Task from '#modules/tasks/infra/models/task'
import type { TaskUpdatedEvent } from '#modules/tasks/public_contracts/task_events'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  cleanupTestData,
  OrganizationFactory,
  ProjectFactory,
  TaskFactory,
  UserFactory,
} from '#tests/helpers/factories'

async function countUpdateTimeAuditLogs(taskId: string): Promise<number> {
  const logs = await db
    .from('audit_events')
    .where('entity_type', 'task')
    .where('entity_id', taskId)
    .where('action', 'update_time')
  return logs.length
}

class TaskEventPublisherSpy implements TaskEventPublisher {
  public updatedEvents: TaskUpdatedEvent[] = []

  publishTaskCreated(): Promise<void> {
    return Promise.resolve()
  }
  publishTaskDeleted(): Promise<void> {
    return Promise.resolve()
  }
  publishTaskStatusChanged(): Promise<void> {
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

  publishTaskUpdated(event: TaskUpdatedEvent): Promise<void> {
    this.updatedEvents.push(event)
    return Promise.resolve()
  }
}

test.group('Integration | Update Task Time', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('updates task time fields and writes audit trail', async ({ assert }) => {
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
      estimated_time: 2,
      actual_time: 1,
    })

    const command = new UpdateTaskTimeCommand(
      makeSystemTaskActionContext(owner.id),
      taskExternalDeps,
      new TaskCacheInvalidator(),
      new TaskEventPublisherSpy()
    )
    const dto = new UpdateTaskTimeDTO({
      task_id: task.id,
      estimated_time: 5,
      actual_time: 3,
    })

    const updatedTask = await command.execute(dto)

    assert.equal(updatedTask.estimated_time, 5)
    assert.equal(updatedTask.actual_time, 3)

    const persistedTask = await Task.findOrFail(task.id)
    assert.equal(persistedTask.estimated_time, 5)
    assert.equal(persistedTask.actual_time, 3)
    assert.equal(persistedTask.updated_by, owner.id)
    assert.equal(await countUpdateTimeAuditLogs(task.id), 1)
  })

  test('rejects unauthorized time updates and leaves task untouched', async ({ assert }) => {
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
      estimated_time: 2,
      actual_time: 1,
    })

    const command = new UpdateTaskTimeCommand(
      makeSystemTaskActionContext(outsider.id),
      taskExternalDeps,
      new TaskCacheInvalidator(),
      new TaskEventPublisherSpy()
    )
    const dto = new UpdateTaskTimeDTO({
      task_id: task.id,
      estimated_time: 9,
    })

    await assert.rejects(() => command.execute(dto))

    const persistedTask = await Task.findOrFail(task.id)
    assert.equal(persistedTask.estimated_time, 2)
    assert.equal(persistedTask.actual_time, 1)
    assert.equal(await countUpdateTimeAuditLogs(task.id), 0)
  })

  test('publishes task-updated event through task event publisher after time update', async ({
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
      estimated_time: 2,
      actual_time: 1,
    })
    const taskEventPublisherSpy = new TaskEventPublisherSpy()

    const command = new UpdateTaskTimeCommand(
      makeSystemTaskActionContext(owner.id),
      taskExternalDeps,
      new TaskCacheInvalidator(),
      taskEventPublisherSpy
    )

    await command.execute(
      new UpdateTaskTimeDTO({
        task_id: task.id,
        estimated_time: 8,
        actual_time: 5,
      })
    )

    assert.lengthOf(taskEventPublisherSpy.updatedEvents, 1)
    assert.deepEqual(taskEventPublisherSpy.updatedEvents[0], {
      taskId: task.id,
      organizationId: org.id,
      updatedBy: owner.id,
      changes: {
        estimated_time: 8,
        actual_time: 5,
      },
      previousValues: {
        estimated_time: 2,
        actual_time: 1,
      },
    })
  })
})
