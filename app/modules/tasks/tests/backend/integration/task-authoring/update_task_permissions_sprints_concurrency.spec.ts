import crypto from 'node:crypto'

import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'
import { DateTime } from 'luxon'

import {
  BusinessPolicyViolationException,
  ForbiddenPolicyViolationException,
} from '#modules/authorization/public_contracts/policy_violation'
import UpdateTaskDTO from '#modules/tasks/actions/dtos/request/update_task_dto'
import Task from '#modules/tasks/infra/models/task-authoring/task'
import { UpdateTaskScenario } from '#modules/tasks/tests/backend/support/update_task_scenario'
import {
  cleanupUpdateTaskData,
  omitUndefined,
  setupUpdateTaskGroup,
  teardownUpdateTaskGroup,
} from '#modules/tasks/tests/backend/support/update_task_test_support'

test.group('Integration | Update Task - Permissions, Sprints, and Concurrency', (group) => {
  group.setup(() => setupUpdateTaskGroup())
  group.teardown(() => teardownUpdateTaskGroup())
  group.each.teardown(() => cleanupUpdateTaskData())

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
      ForbiddenPolicyViolationException
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
      ForbiddenPolicyViolationException
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
      BusinessPolicyViolationException
    )

    const persistedTask = await Task.findOrFail(task.id)
    assert.isNull(persistedTask.project_sprint_id)
    assert.isNull(await scenario.findVersionSnapshot(task.id))
    assert.equal(await scenario.countUpdateAuditLogs(task.id), 0)
  })

  test('routes same-project sprint assignment through planning history', async ({ assert }) => {
    const scenario = await UpdateTaskScenario.create()
    const sprintId = crypto.randomUUID()
    const now = DateTime.utc()
    const task = await scenario.createTask({ title: 'Planning boundary task' })

    await db.table('project_sprints').insert({
      id: sprintId,
      organization_id: scenario.org.id,
      project_id: scenario.project.id,
      name: 'Active planning sprint',
      status: 'active',
      starts_at: now.minus({ days: 1 }).toSQL(),
      ends_at: now.plus({ days: 13 }).toSQL(),
      created_by: scenario.owner.id,
      created_at: now.toSQL(),
      updated_at: now.toSQL(),
    })

    await scenario.execute(
      task.id,
      new UpdateTaskDTO({ project_sprint_id: sprintId })
    )

    const persistedTask = await Task.findOrFail(task.id)
    assert.equal(persistedTask.project_sprint_id, sprintId)
    const history = (await db
      .from('project_sprint_task_assignments')
      .where({ project_id: scenario.project.id, task_id: task.id })
      .orderBy('entered_at', 'asc')) as Array<{ sprint_id: string | null; added_after_start: boolean }>

    assert.lengthOf(history, 2)
    assert.isNull(history[0]?.sprint_id)
    assert.equal(history[1]?.sprint_id, sprintId)
    assert.isTrue(history[1]?.added_after_start)
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
      BusinessPolicyViolationException
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
