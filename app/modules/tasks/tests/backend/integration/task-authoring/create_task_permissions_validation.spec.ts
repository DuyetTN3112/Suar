import crypto from 'node:crypto'

import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'
import { DateTime } from 'luxon'

import {
  BusinessPolicyViolationException,
  ForbiddenPolicyViolationException,
} from '#modules/authorization/public_contracts/policy_violation'
import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import ValidationException from '#modules/errors/public_contracts/validation_exception'
import Task from '#modules/tasks/infra/models/task-authoring/task'
import CreateTaskScenario from '#modules/tasks/tests/backend/support/task-authoring/create_task_scenario'
import {
  cleanupTaskCreationTestData,
  setupTaskCreationTestGroup,
  teardownTaskCreationTestGroup,
} from '#modules/tasks/tests/backend/support/task-authoring/create_task_test_support'

test.group('Integration | Create Task - Permissions and Validation', (group) => {
  group.setup(() => setupTaskCreationTestGroup())
  group.teardown(() => teardownTaskCreationTestGroup())
  group.each.teardown(() => cleanupTaskCreationTestData())

  test('throws when user is not active', async ({ assert }) => {
    const scenario = await CreateTaskScenario.build()
    const inactiveUser = await scenario.createInactiveUser()

    await assert.rejects(
      () =>
        scenario.createAs(inactiveUser.id, {
          title: 'Should Fail',
        }),
      NotFoundException
    )
  })

  test('throws when user has no permission to create task', async ({ assert }) => {
    const scenario = await CreateTaskScenario.build()
    const outsider = await scenario.createOutsider()

    await assert.rejects(
      () =>
        scenario.createAs(outsider.id, {
          title: 'Should Fail',
        }),
      ForbiddenPolicyViolationException
    )
  })

  test('throws when project does not belong to org', async ({ assert }) => {
    const scenario = await CreateTaskScenario.build()
    const project = await scenario.createForeignProject()

    await assert.rejects(
      () =>
        scenario.create({
          title: 'Should Fail',
          project_id: project.id,
        }),
      BusinessLogicException
    )
  })

  test('rejects unknown project id and leaves task table unchanged', async ({ assert }) => {
    const scenario = await CreateTaskScenario.build()
    const title = 'Unknown Project Task'

    await assert.rejects(
      () =>
        scenario.create({
          title,
          project_id: crypto.randomUUID(),
        }),
      NotFoundException
    )

    const persistedTask = await Task.query().where('title', title).whereNull('deleted_at').first()

    assert.isNull(persistedTask)
  })

  test('assignee must be org member', async ({ assert }) => {
    const scenario = await CreateTaskScenario.build()
    const outsider = await scenario.createOutsider()

    await assert.rejects(
      () =>
        scenario.create({
          title: 'Invalid Assignee',
          assigned_to: outsider.id,
        }),
      BusinessPolicyViolationException
    )
  })

  test('rejects unknown assignee id and leaves task table unchanged', async ({ assert }) => {
    const scenario = await CreateTaskScenario.build()
    const title = 'Unknown Assignee Task'

    await assert.rejects(
      () =>
        scenario.create({
          title,
          assigned_to: crypto.randomUUID(),
        }),
      BusinessPolicyViolationException
    )

    const persistedTask = await Task.query().where('title', title).whereNull('deleted_at').first()

    assert.isNull(persistedTask)
  })

  test('allows assigning a external_contributor outside the organization', async ({ assert }) => {
    const scenario = await CreateTaskScenario.build()
    const externalContributor = await scenario.createExternalContributor()
    const task = await scenario.create({
      title: 'ExternalContributor Assignee Task',
      assigned_to: externalContributor.id,
      task_visibility: 'external',
    })

    assert.equal(task.assigned_to, externalContributor.id)
  })

  test('rolls back task creation if required skill validation fails after task insert', async ({
    assert,
  }) => {
    const scenario = await CreateTaskScenario.build()
    const title = 'Rollback Required Skill Task'
    const inactiveSkill = await scenario.createInactiveSkill()

    await assert.rejects(
      () =>
        scenario.create({
          title,
          required_skill_id: inactiveSkill.id,
        }),
      BusinessLogicException
    )

    const rolledBackTask = await Task.query()
      .where('project_id', scenario.project.id)
      .where('title', title)
      .whereNull('deleted_at')
      .first()

    assert.isNull(rolledBackTask)
  })

  test('parent task from another organization is rejected', async ({ assert }) => {
    const scenario = await CreateTaskScenario.build()
    const parentTask = await scenario.createForeignParentTask()

    await assert.rejects(
      () =>
        scenario.create({
          title: 'Child Task',
          parent_task_id: parentTask.id,
        }),
      NotFoundException
    )
  })

  test('rejects creating a task with a past due date and leaves task table unchanged', async ({
    assert,
  }) => {
    const scenario = await CreateTaskScenario.build()
    const title = 'Past Due Date Task'

    await assert.rejects(
      () =>
        scenario.create({
          title,
          due_date: '2020-01-01',
        }),
      BusinessPolicyViolationException
    )

    const persistedTask = await Task.query().where('title', title).whereNull('deleted_at').first()

    assert.isNull(persistedTask)
  })

  test('rejects overlong descriptions and leaves task table unchanged', async ({ assert }) => {
    const scenario = await CreateTaskScenario.build()
    const title = 'Overlong Description Task'

    await assert.rejects(
      () =>
        scenario.create({
          title,
          description: 'D'.repeat(5001),
        }),
      ValidationException
    )

    const persistedTask = await Task.query().where('title', title).whereNull('deleted_at').first()

    assert.isNull(persistedTask)
  })

  test('rejects invalid create enum values and leaves task table unchanged', async ({ assert }) => {
    const scenario = await CreateTaskScenario.build()
    const invalidEnumCases = [
      {
        title: 'Invalid Task Type Task',
        overrides: { task_type: 'fake_task_type' },
      },
      {
        title: 'Invalid Task Visibility Task',
        overrides: { task_visibility: 'fake_visibility' },
      },
    ] as const

    for (const invalidEnumCase of invalidEnumCases) {
      await assert.rejects(
        () =>
          scenario.create({
            title: invalidEnumCase.title,
            ...invalidEnumCase.overrides,
          }),
        ValidationException
      )

      const persistedTask = await Task.query()
        .where('title', invalidEnumCase.title)
        .whereNull('deleted_at')
        .first()

      assert.isNull(persistedTask)
    }
  })

  test('project manager can create task in their project', async ({ assert }) => {
    const scenario = await CreateTaskScenario.build()
    const manager = await scenario.createProjectManager()

    const task = await scenario.createAs(manager.id, {
      title: 'Manager Task',
    })

    assert.equal(task.project_id, scenario.project.id)
  }).timeout(10_000)

  test('explicit Sprint assignment at task creation uses the planning boundary', async ({ assert }) => {
    const scenario = await CreateTaskScenario.build()
    const sprintId = crypto.randomUUID()
    const now = DateTime.utc()
    await db.table('project_sprints').insert({
      id: sprintId,
      organization_id: scenario.organizationId,
      project_id: scenario.project.id,
      name: 'Creation Sprint',
      status: 'active',
      starts_at: now.minus({ days: 1 }).toSQL(),
      ends_at: now.plus({ days: 13 }).toSQL(),
      created_by: scenario.ownerId,
      created_at: now.toSQL(),
      updated_at: now.toSQL(),
    })

    const task = await scenario.create({ project_sprint_id: sprintId })
    const history = (await db
      .from('project_sprint_task_assignments')
      .where({ project_id: scenario.project.id, task_id: task.id })) as Array<{
      sprint_id: string | null
      added_after_start: boolean
    }>

    assert.equal(task.project_sprint_id, sprintId)
    assert.lengthOf(history, 1)
    assert.equal(history[0]?.sprint_id, sprintId)
    assert.isTrue(history[0]?.added_after_start)
  }).timeout(10_000)

  test('superadmin cannot create task without organization or project membership', async ({
    assert,
  }) => {
    const scenario = await CreateTaskScenario.build()
    const superadmin = await scenario.createSuperadmin()

    await assert.rejects(
      () =>
        scenario.createAs(superadmin.id, {
          title: 'Superadmin Task',
        }),
      ForbiddenPolicyViolationException
    )
  })
})
