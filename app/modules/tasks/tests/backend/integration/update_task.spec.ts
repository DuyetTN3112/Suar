import crypto from 'node:crypto'

import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'
import { DateTime } from 'luxon'

import { omitUndefined } from '#modules/contracts/public_contracts/optional_payload'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import ForbiddenException from '#modules/http/exceptions/forbidden_exception'
import UpdateTaskDTO from '#modules/tasks/actions/dtos/request/update_task_dto'
import Task from '#modules/tasks/infra/models/task'
import {
  UpdateTaskScenario,
} from '#modules/tasks/tests/backend/support/update_task_scenario'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { cleanupTestData } from '#tests/helpers/factories'

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

  test('rejects assigning a task to a sprint from another project', async ({ assert }) => {
    const scenario = await UpdateTaskScenario.create()
    const otherProject = await scenario.createProject()
    const foreignSprintId = crypto.randomUUID()
    const task = await scenario.createTask({ title: 'Backlog task' })

    await db.table('project_sprints').insert({
      id: foreignSprintId,
      organization_id: scenario.org.id,
      project_id: otherProject.id,
      name: 'Foreign sprint',
      status: 'active',
      starts_at: DateTime.utc().minus({ days: 1 }).toSQL(),
      ends_at: DateTime.utc().plus({ days: 13 }).toSQL(),
      created_by: scenario.owner.id,
      created_at: DateTime.utc().toSQL(),
      updated_at: DateTime.utc().toSQL(),
    })

    await assert.rejects(
      () =>
        scenario.execute(
          task.id,
          new UpdateTaskDTO({
            project_sprint_id: foreignSprintId,
          })
        ),
      BusinessLogicException
    )

    const persistedTask = await Task.findOrFail(task.id)
    assert.isNull(persistedTask.project_sprint_id)
    assert.isNull(await scenario.findVersionSnapshot(task.id))
    assert.equal(await scenario.countUpdateAuditLogs(task.id), 0)
  })

  test('rejects updating a task parent to one of its descendants', async ({ assert }) => {
    const scenario = await UpdateTaskScenario.create()
    const parentTask = await scenario.createTask({
      title: 'Parent Task',
    })
    const childTask = await scenario.createTask({
      title: 'Child Task',
      parent_task_id: parentTask.id,
    })

    await assert.rejects(
      () =>
        scenario.execute(
          parentTask.id,
          new UpdateTaskDTO({
            parent_task_id: childTask.id,
          })
        ),
      BusinessLogicException
    )

    const persistedParent = await Task.findOrFail(parentTask.id)
    assert.isNull(persistedParent.parent_task_id)
    assert.isNull(await scenario.findVersionSnapshot(parentTask.id))
    assert.equal(await scenario.countUpdateAuditLogs(parentTask.id), 0)
  })

  test('rejects stale version updates and leaves newer task state unchanged', async ({
    assert,
  }) => {
    const scenario = await UpdateTaskScenario.create()
    const task = await scenario.createTask({
      title: 'Original concurrent task',
    })
    const staleUpdatedAt = task.updated_at.toISO()

    await scenario.execute(
      task.id,
      new UpdateTaskDTO({
        title: 'Fresh update wins',
      })
    )

    await assert.rejects(
      () =>
        scenario.execute(
          task.id,
          new UpdateTaskDTO(omitUndefined({
            title: 'Stale update loses',
            expected_updated_at: staleUpdatedAt ?? undefined,
          }))
        ),
      /đã được cập nhật bởi người khác/
    )

    const persistedTask = await Task.findOrFail(task.id)
    assert.equal(persistedTask.title, 'Fresh update wins')
  })
})
