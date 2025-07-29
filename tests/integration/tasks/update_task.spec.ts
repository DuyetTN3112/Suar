import { test } from '@japa/runner'

import UpdateTaskDTO from '#actions/tasks/dtos/request/update_task_dto'
import BusinessLogicException from '#exceptions/business_logic_exception'
import ForbiddenException from '#exceptions/forbidden_exception'
import Task from '#models/task'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { cleanupTestData } from '#tests/helpers/factories'
import {
  UpdateTaskScenario,
} from '#tests/integration/tasks/support/update_task_scenario'

test.group('Integration | Update Task', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('updates task fields, creates a version snapshot, and writes audit trail', async ({
    assert,
  }) => {
    const scenario = await UpdateTaskScenario.create()
    const assignee = await scenario.createOrgMember()
    const task = await scenario.createTask({
      title: 'Original task title',
      description: 'Original task description',
      assigned_to: null,
      estimated_time: 2,
    })

    const updatedTask = await scenario.execute(
      task.id,
      new UpdateTaskDTO({
        title: 'Updated task title',
        assigned_to: assignee.id,
        estimated_time: 5,
      })
    )

    assert.equal(updatedTask.title, 'Updated task title')
    assert.equal(updatedTask.assigned_to, assignee.id)
    assert.equal(updatedTask.estimated_time, 5)

    const persistedTask = await Task.findOrFail(task.id)
    assert.equal(persistedTask.title, 'Updated task title')
    assert.equal(persistedTask.assigned_to, assignee.id)
    assert.equal(persistedTask.estimated_time, 5)

    const versionSnapshot = await scenario.findVersionSnapshot(task.id)
    assert.isNotNull(versionSnapshot)
    assert.equal(versionSnapshot?.title, 'Original task title')
    assert.isNull(versionSnapshot?.assigned_to)

    assert.isAbove(await scenario.countUpdateAuditLogs(task.id), 0)
  })

  test('does not create a version snapshot when only project_id changes', async ({ assert }) => {
    const scenario = await UpdateTaskScenario.create()
    const replacementProject = await scenario.createProject()
    const task = await scenario.createTask()

    const updatedTask = await scenario.execute(
      task.id,
      new UpdateTaskDTO({
        project_id: replacementProject.id,
      })
    )

    assert.equal(updatedTask.project_id, replacementProject.id)

    const versionSnapshot = await scenario.findVersionSnapshot(task.id)
    assert.isNull(versionSnapshot)
  })

  test('does not send a notification when assigning the task to the updater themself', async ({
    assert,
  }) => {
    const scenario = await UpdateTaskScenario.create()
    const task = await scenario.createTask({ assigned_to: null })
    const notificationSpy = scenario.createNotificationSpy()

    await scenario.executeWithNotification(
      task.id,
      new UpdateTaskDTO({
        assigned_to: scenario.owner.id,
      }),
      scenario.owner.id,
      notificationSpy
    )

    assert.lengthOf(notificationSpy.calls, 0)
  })

  test('notifies the previous assignee when the task is unassigned', async ({ assert }) => {
    const scenario = await UpdateTaskScenario.create()
    const assignee = await scenario.createOrgMember()
    const task = await scenario.createTask({
      assigned_to: assignee.id,
    })
    const notificationSpy = scenario.createNotificationSpy()

    await scenario.executeWithNotification(
      task.id,
      new UpdateTaskDTO({
        assigned_to: null,
      }),
      scenario.owner.id,
      notificationSpy
    )

    assert.lengthOf(notificationSpy.calls, 1)
    assert.equal(notificationSpy.calls[0]?.user_id, assignee.id)
    assert.equal(notificationSpy.calls[0]?.type, 'task_updated')
  })

  test('rejects invalid assignee updates and leaves task state unchanged', async ({ assert }) => {
    const scenario = await UpdateTaskScenario.create()
    const outsider = await scenario.createForeignOrg()
    const task = await scenario.createTask({
      title: 'Unchanged task title',
      assigned_to: null,
    })

    await assert.rejects(
      () =>
        scenario.execute(
          task.id,
          new UpdateTaskDTO({
            assigned_to: outsider.owner.id,
          })
        ),
      BusinessLogicException
    )

    const persistedTask = await Task.findOrFail(task.id)
    assert.equal(persistedTask.title, 'Unchanged task title')
    assert.isNull(persistedTask.assigned_to)

    const versionSnapshot = await scenario.findVersionSnapshot(task.id)
    assert.isNull(versionSnapshot)
    assert.equal(await scenario.countUpdateAuditLogs(task.id), 0)
  })

  test('rejects updates when actor lacks task field permission and leaves task untouched', async ({
    assert,
  }) => {
    const scenario = await UpdateTaskScenario.create()
    const member = await scenario.createOrgMember()
    const task = await scenario.createTask({
      title: 'Permission Locked Task',
    })

    await assert.rejects(
      () =>
        scenario.execute(
          task.id,
          new UpdateTaskDTO({
            title: 'Should Not Persist',
          }),
          member.id
        ),
      ForbiddenException
    )

    const persistedTask = await Task.findOrFail(task.id)
    assert.equal(persistedTask.title, 'Permission Locked Task')
    assert.isNull(await scenario.findVersionSnapshot(task.id))
    assert.equal(await scenario.countUpdateAuditLogs(task.id), 0)
  })

  test('rejects updates when current organization context does not match the task', async ({
    assert,
  }) => {
    const scenario = await UpdateTaskScenario.create()
    const otherOrg = await scenario.createForeignOrg()
    const task = await scenario.createTask()

    await assert.rejects(
      () =>
        scenario.executeWithNotification(
          task.id,
          new UpdateTaskDTO({
            title: 'Should be rejected',
          }),
          scenario.owner.id,
          scenario.createNotificationSpy(),
          otherOrg.org.id
        ),
      ForbiddenException
    )

    const persistedTask = await Task.findOrFail(task.id)
    assert.notEqual(persistedTask.title, 'Should be rejected')
    assert.isNull(await scenario.findVersionSnapshot(task.id))
    assert.equal(await scenario.countUpdateAuditLogs(task.id), 0)
  })
})
