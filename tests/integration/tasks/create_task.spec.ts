import { test } from '@japa/runner'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  UserFactory,
  OrganizationFactory,
  OrganizationUserFactory,
  ProjectFactory,
  ProjectMemberFactory,
  TaskFactory,
  SkillFactory,
  cleanupTestData,
} from '#tests/helpers/factories'
import CreateTaskCommand from '#actions/tasks/commands/create_task_command'
import CreateTaskDTO from '#actions/tasks/dtos/request/create_task_dto'
import CreateNotification from '#actions/common/create_notification'
import Project from '#models/project'
import Task from '#models/task'
import { MongoAuditLogModel } from '#models/mongo/audit_log'
import TaskStatusModel from '#models/task_status'
import { ExecutionContext } from '#types/execution_context'
import { TaskStatus } from '#constants/task_constants'
import { seedDefaultTaskStatuses } from '#actions/tasks/commands/seed_default_task_statuses'
import BusinessLogicException from '#exceptions/business_logic_exception'
import db from '@adonisjs/lucid/services/db'

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

async function getTodoStatusId(organizationId: string): Promise<string> {
  const trx = await db.transaction()
  try {
    await seedDefaultTaskStatuses(organizationId, trx)
    await trx.commit()
  } catch (error) {
    await trx.rollback()
    throw error
  }

  const todo = await TaskStatusModel.query()
    .where('organization_id', organizationId)
    .where('slug', 'todo')
    .whereNull('deleted_at')
    .firstOrFail()

  return todo.id
}

function buildCreateTaskDTO(input: {
  organizationId: string
  taskStatusId: string
  requiredSkillId: string
  projectId: string
  title?: string
  description?: string
  assigned_to?: string
  parent_task_id?: string
}): CreateTaskDTO {
  return new CreateTaskDTO({
    title: input.title ?? 'Test Task Title',
    description: input.description ?? 'Test description',
    task_status_id: input.taskStatusId,
    organization_id: input.organizationId,
    project_id: input.projectId,
    acceptance_criteria: 'Task is accepted when all checks pass',
    required_skills: [{ id: input.requiredSkillId, level: 'middle' }],
    assigned_to: input.assigned_to,
    parent_task_id: input.parent_task_id,
  })
}

async function createRequiredSkillId(): Promise<string> {
  const skill = await SkillFactory.create()
  return skill.id
}

async function createTaskProject(organizationId: string, ownerId: string): Promise<string> {
  const project = await ProjectFactory.create({
    organization_id: organizationId,
    creator_id: ownerId,
    owner_id: ownerId,
  })

  return project.id
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
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const todoStatusId = await getTodoStatusId(org.id)
    const requiredSkillId = await createRequiredSkillId()
    const projectId = await createTaskProject(org.id, owner.id)

    const ctx = ExecutionContext.system(owner.id)
    const command = new CreateTaskCommand(ctx, new CreateNotification())

    const dto = buildCreateTaskDTO({
      organizationId: org.id,
      taskStatusId: todoStatusId,
      requiredSkillId,
      projectId,
      title: 'Test Task Title',
      description: 'Test description',
    })

    const task = await command.execute(dto)

    assert.isNotNull(task)
    assert.equal(task.title, 'Test Task Title')
    assert.equal(task.status, TaskStatus.TODO)
    assert.equal(task.task_status_id, todoStatusId)
    assert.equal(task.creator_id, owner.id)

    const dbTask = await Task.find(task.id)
    assert.isNotNull(dbTask)
  })

  test('task organization_id stays aligned with the owning project organization as a denormalized invariant', async ({
    assert,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const todoStatusId = await getTodoStatusId(org.id)
    const requiredSkillId = await createRequiredSkillId()
    const projectId = await createTaskProject(org.id, owner.id)

    const ctx = ExecutionContext.system(owner.id)
    const command = new CreateTaskCommand(ctx, new CreateNotification())

    const dto = buildCreateTaskDTO({
      organizationId: org.id,
      taskStatusId: todoStatusId,
      requiredSkillId,
      projectId,
      title: 'Org Task',
    })

    const task = await command.execute(dto)
    const project = await Project.findOrFail(task.project_id)

    assert.equal(project.organization_id, org.id)
    assert.equal(task.organization_id, project.organization_id)
  })

  test('creates audit log after task creation', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const todoStatusId = await getTodoStatusId(org.id)
    const requiredSkillId = await createRequiredSkillId()
    const projectId = await createTaskProject(org.id, owner.id)

    const ctx = ExecutionContext.system(owner.id)
    const command = new CreateTaskCommand(ctx, new CreateNotification())

    const dto = buildCreateTaskDTO({
      organizationId: org.id,
      taskStatusId: todoStatusId,
      requiredSkillId,
      projectId,
      title: 'Audited Task',
    })

    const task = await command.execute(dto)

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
    const inactiveUser = await UserFactory.create({ status: 'inactive' })
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const todoStatusId = await getTodoStatusId(org.id)
    const requiredSkillId = await createRequiredSkillId()
    const projectId = await createTaskProject(org.id, owner.id)

    const ctx = ExecutionContext.system(inactiveUser.id)
    const command = new CreateTaskCommand(ctx, new CreateNotification())

    const dto = buildCreateTaskDTO({
      organizationId: org.id,
      taskStatusId: todoStatusId,
      requiredSkillId,
      projectId,
      title: 'Should Fail',
    })

    await assert.rejects(() => command.execute(dto))
  })

  test('throws when user has no permission to create task', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const outsider = await UserFactory.create()
    const todoStatusId = await getTodoStatusId(org.id)
    const requiredSkillId = await createRequiredSkillId()
    const projectId = await createTaskProject(org.id, owner.id)

    const ctx = ExecutionContext.system(outsider.id)
    const command = new CreateTaskCommand(ctx, new CreateNotification())

    const dto = buildCreateTaskDTO({
      organizationId: org.id,
      taskStatusId: todoStatusId,
      requiredSkillId,
      projectId,
      title: 'Should Fail',
    })

    await assert.rejects(() => command.execute(dto))
  })

  test('throws when project does not belong to org', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const { org: otherOrg } = await OrganizationFactory.createWithOwner()
    const project = await ProjectFactory.create({
      organization_id: otherOrg.id,
      creator_id: otherOrg.owner_id,
    })
    const todoStatusId = await getTodoStatusId(org.id)
    const requiredSkillId = await createRequiredSkillId()

    const ctx = ExecutionContext.system(owner.id)
    const command = new CreateTaskCommand(ctx, new CreateNotification())

    const dto = buildCreateTaskDTO({
      organizationId: org.id,
      taskStatusId: todoStatusId,
      requiredSkillId,
      projectId: project.id,
      title: 'Should Fail',
    })

    await assert.rejects(() => command.execute(dto))
  })

  test('assignee must be org member', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const outsider = await UserFactory.create()
    const todoStatusId = await getTodoStatusId(org.id)
    const requiredSkillId = await createRequiredSkillId()
    const projectId = await createTaskProject(org.id, owner.id)

    const ctx = ExecutionContext.system(owner.id)
    const command = new CreateTaskCommand(ctx, new CreateNotification())

    const dto = buildCreateTaskDTO({
      organizationId: org.id,
      taskStatusId: todoStatusId,
      requiredSkillId,
      projectId,
      title: 'Invalid Assignee',
      assigned_to: outsider.id,
    })

    await assert.rejects(() => command.execute(dto))
  })

  test('allows assigning a freelancer outside the organization', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const freelancer = await UserFactory.createFreelancer()
    const todoStatusId = await getTodoStatusId(org.id)
    const requiredSkillId = await createRequiredSkillId()
    const projectId = await createTaskProject(org.id, owner.id)

    const ctx = ExecutionContext.system(owner.id)
    const command = new CreateTaskCommand(ctx, new CreateNotification())

    const dto = buildCreateTaskDTO({
      organizationId: org.id,
      taskStatusId: todoStatusId,
      requiredSkillId,
      projectId,
      title: 'Freelancer Assignee Task',
      assigned_to: freelancer.id,
    })

    const task = await command.execute(dto)

    assert.equal(task.assigned_to, freelancer.id)
  })

  test('rolls back task creation if required skill validation fails after task insert', async ({
    assert,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const todoStatusId = await getTodoStatusId(org.id)
    const projectId = await createTaskProject(org.id, owner.id)
    const title = 'Rollback Required Skill Task'
    const inactiveSkill = await SkillFactory.create({ is_active: false })

    const ctx = ExecutionContext.system(owner.id)
    const command = new CreateTaskCommand(ctx, new CreateNotification())

    const dto = buildCreateTaskDTO({
      organizationId: org.id,
      taskStatusId: todoStatusId,
      requiredSkillId: inactiveSkill.id,
      projectId,
      title,
    })

    await assert.rejects(() => command.execute(dto), BusinessLogicException)

    const rolledBackTask = await Task.query()
      .where('project_id', projectId)
      .where('title', title)
      .whereNull('deleted_at')
      .first()

    assert.isNull(rolledBackTask)
  })

  test('parent task from another organization is rejected', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const { org: otherOrg, owner: otherOwner } = await OrganizationFactory.createWithOwner()
    const todoStatusId = await getTodoStatusId(org.id)
    const projectId = await createTaskProject(org.id, owner.id)
    const otherProjectId = await createTaskProject(otherOrg.id, otherOwner.id)
    const parentTask = await TaskFactory.create({
      creator_id: otherOwner.id,
      project_id: otherProjectId,
    })

    const requiredSkillId = await createRequiredSkillId()
    const ctx = ExecutionContext.system(owner.id)
    const command = new CreateTaskCommand(ctx, new CreateNotification())

    const dto = buildCreateTaskDTO({
      organizationId: org.id,
      taskStatusId: todoStatusId,
      requiredSkillId,
      projectId,
      title: 'Child Task',
      parent_task_id: parentTask.id,
    })

    try {
      await command.execute(dto)
      assert.fail('Expected cross-organization parent task to be rejected')
    } catch (error) {
      assert.instanceOf(error, BusinessLogicException)
      assert.include((error as BusinessLogicException).message, 'cùng tổ chức')
    }
  })

  test('project manager can create task in their project', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const manager = await UserFactory.create()
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: manager.id,
      org_role: 'org_member',
      status: 'approved',
    })

    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
    })
    await ProjectMemberFactory.create({
      project_id: project.id,
      user_id: manager.id,
      project_role: 'project_manager',
    })

    const todoStatusId = await getTodoStatusId(org.id)
    const requiredSkillId = await createRequiredSkillId()
    const ctx = ExecutionContext.system(manager.id)
    const command = new CreateTaskCommand(ctx, new CreateNotification())

    const dto = buildCreateTaskDTO({
      organizationId: org.id,
      taskStatusId: todoStatusId,
      requiredSkillId,
      projectId: project.id,
      title: 'Manager Task',
    })

    const task = await command.execute(dto)
    assert.equal(task.project_id, project.id)
  })

  test('superadmin can create task in any org', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const superadmin = await UserFactory.createSuperadmin()
    const todoStatusId = await getTodoStatusId(org.id)
    const requiredSkillId = await createRequiredSkillId()
    const projectId = await createTaskProject(org.id, owner.id)

    const ctx = ExecutionContext.system(superadmin.id)
    const command = new CreateTaskCommand(ctx, new CreateNotification())

    const dto = buildCreateTaskDTO({
      organizationId: org.id,
      taskStatusId: todoStatusId,
      requiredSkillId,
      projectId,
      title: 'Superadmin Task',
    })

    const task = await command.execute(dto)
    assert.isNotNull(task)
    assert.equal(task.creator_id, superadmin.id)
  })
})
