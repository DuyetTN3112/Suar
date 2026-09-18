import { test } from '@japa/runner'

import { BusinessPolicyViolationException } from '#modules/authorization/public_contracts/policy_violation'
import UpdateTaskDTO from '#modules/tasks/actions/dtos/request/update_task_dto'
import Task from '#modules/tasks/infra/models/task-authoring/task'
import { UpdateTaskScenario } from '#modules/tasks/tests/backend/support/update_task_scenario'
import {
  cleanupUpdateTaskData,
  FailingNotificationStager,
  setupUpdateTaskGroup,
  teardownUpdateTaskGroup,
} from '#modules/tasks/tests/backend/support/update_task_test_support'

test.group('Integration | Update Task - Notifications and Staging', (group) => {
  group.setup(() => setupUpdateTaskGroup())
  group.teardown(() => teardownUpdateTaskGroup())
  group.each.teardown(() => cleanupUpdateTaskData())

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
    assert.equal(notificationSpy.calls[0]?.recipientId, assignee.id)
    assert.equal(notificationSpy.calls[0]?.type, 'task_updated')
  })

  test('required assignee notification staging failure rolls update, version, and audit back', async ({
    assert,
  }) => {
    const scenario = await UpdateTaskScenario.create()
    const assignee = await scenario.createOrgMember()
    const task = await scenario.createTask({
      title: 'Atomic update task',
      assigned_to: null,
    })
    const notification = new FailingNotificationStager()

    await assert.rejects(
      () =>
        scenario.executeWithNotification(
          task.id,
          new UpdateTaskDTO({ assigned_to: assignee.id }),
          scenario.owner.id,
          notification
        ),
      'task update notification staging failed'
    )

    const persistedTask = await Task.findOrFail(task.id)
    assert.equal(notification.calls, 1)
    assert.isNull(persistedTask.assigned_to)
    assert.isNull(await scenario.findVersionSnapshot(task.id))
    assert.equal(await scenario.countUpdateAuditLogs(task.id), 0)
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
      BusinessPolicyViolationException
    )

    const persistedTask = await Task.findOrFail(task.id)
    assert.equal(persistedTask.title, 'Unchanged task title')
    assert.isNull(persistedTask.assigned_to)

    const versionSnapshot = await scenario.findVersionSnapshot(task.id)
    assert.isNull(versionSnapshot)
    assert.equal(await scenario.countUpdateAuditLogs(task.id), 0)
  })
})
