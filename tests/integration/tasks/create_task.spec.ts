import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import BusinessLogicException from '#exceptions/business_logic_exception'
import ForbiddenException from '#exceptions/forbidden_exception'
import NotFoundException from '#exceptions/not_found_exception'
import { MongoAuditLogModel } from '#infra/audit/models/audit_log'
import Project from '#infra/projects/models/project'
import Task from '#infra/tasks/models/task'
import { TaskStatus } from '#modules/tasks/constants/task_constants'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { cleanupTestData } from '#tests/helpers/factories'
import CreateTaskScenario from '#tests/integration/tasks/support/create_task_scenario'

async function checkTaskV5Schema(): Promise<boolean> {
  const rawResult: unknown = await db
    .from('information_schema.columns')
    .where('table_name', 'tasks')
    .whereIn('column_name', ['acceptance_criteria', 'verification_method'])
    .count('* as total')
    .first()

  const result = rawResult as { total?: number | string } | null
  const total = Number(result?.total ?? 0)
  return total >= 2
}

test.group('Integration | Create Task', (group) => {
  group.setup(async () => {
    await setupApp()
    const hasTaskV5Schema = await checkTaskV5Schema()
    if (!hasTaskV5Schema) {
      throw new Error(
        'Task integration tests require the current task schema with acceptance_criteria and verification_method columns'
      )
    }
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('creates task successfully with valid data', async ({ assert }) => {
    const scenario = await CreateTaskScenario.build()
    const task = await scenario.create({
      title: 'Test Task Title',
      description: 'Test description',
    })

    assert.isNotNull(task)
    assert.equal(task.title, 'Test Task Title')
    assert.equal(task.status, TaskStatus.TODO)
    assert.equal(task.task_status_id, scenario.todoStatusId)
    assert.equal(task.creator_id, scenario.ownerId)

    const dbTask = await Task.find(task.id)
    assert.isNotNull(dbTask)
  })

  test('task organization_id stays aligned with the owning project organization as a denormalized invariant', async ({
    assert,
  }) => {
    const scenario = await CreateTaskScenario.build()
    const task = await scenario.create({
      title: 'Org Task',
    })
    const project = await Project.findOrFail(task.project_id)

    assert.equal(project.organization_id, scenario.organizationId)
    assert.equal(task.organization_id, project.organization_id)
  })

  test('creates audit log after task creation', async ({ assert }) => {
    const scenario = await CreateTaskScenario.build()
    const task = await scenario.create({
      title: 'Audited Task',
    })

    const logs = await MongoAuditLogModel.find({
      entity_type: 'task',
      entity_id: task.id,
      action: 'create',
    })
      .lean()
      .exec()

    assert.isAbove(logs.length, 0)
  })

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
      ForbiddenException
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

  test('assignee must be org member', async ({ assert }) => {
    const scenario = await CreateTaskScenario.build()
    const outsider = await scenario.createOutsider()

    await assert.rejects(
      () =>
        scenario.create({
          title: 'Invalid Assignee',
          assigned_to: outsider.id,
        }),
      BusinessLogicException
    )
  })

  test('allows assigning a freelancer outside the organization', async ({ assert }) => {
    const scenario = await CreateTaskScenario.build()
    const freelancer = await scenario.createFreelancer()
    const task = await scenario.create({
      title: 'Freelancer Assignee Task',
      assigned_to: freelancer.id,
    })

    assert.equal(task.assigned_to, freelancer.id)
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

    try {
      await scenario.create({
        title: 'Child Task',
        parent_task_id: parentTask.id,
      })
      assert.fail('Expected cross-organization parent task to be rejected')
    } catch (error) {
      assert.instanceOf(error, BusinessLogicException)
      assert.include((error as BusinessLogicException).message, 'cùng tổ chức')
    }
  })

  test('project manager can create task in their project', async ({ assert }) => {
    const scenario = await CreateTaskScenario.build()
    const manager = await scenario.createProjectManager()

    const task = await scenario.createAs(manager.id, {
      title: 'Manager Task',
    })

    assert.equal(task.project_id, scenario.project.id)
  })

  test('superadmin can create task in any org', async ({ assert }) => {
    const scenario = await CreateTaskScenario.build()
    const superadmin = await scenario.createSuperadmin()

    const task = await scenario.createAs(superadmin.id, {
      title: 'Superadmin Task',
    })

    assert.isNotNull(task)
    assert.equal(task.creator_id, superadmin.id)
  })
})
