import { test } from '@japa/runner'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  UserFactory,
  OrganizationFactory,
  OrganizationUserFactory,
  ProjectFactory,
  ProjectMemberFactory,
  TaskFactory,
  cleanupTestData,
} from '#tests/helpers/factories'
import CreateTaskCommand from '#actions/tasks/commands/create_task_command'
import CreateTaskDTO from '#actions/tasks/dtos/create_task_dto'
import CreateNotification from '#actions/common/create_notification'
import Task from '#models/task'
import AuditLog from '#models/mongo/audit_log'
import { ExecutionContext } from '#types/execution_context'
import { TaskStatus } from '#constants/task_constants'

test.group('Integration | Create Task', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('creates task successfully with valid data', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const ctx = ExecutionContext.system(owner.id)
    const command = new CreateTaskCommand(ctx, new CreateNotification())

    const dto = new CreateTaskDTO({
      title: 'Test Task Title',
      description: 'Test description',
      status: TaskStatus.TODO,
      organization_id: org.id,
    })

    const task = await command.execute(dto)

    assert.isNotNull(task)
    assert.equal(task.title, 'Test Task Title')
    assert.equal(task.status, TaskStatus.TODO)
    assert.equal(task.organization_id, org.id)
    assert.equal(task.creator_id, owner.id)

    const dbTask = await Task.find(task.id)
    assert.isNotNull(dbTask)
  })

  test('task organization_id is set correctly', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const ctx = ExecutionContext.system(owner.id)
    const command = new CreateTaskCommand(ctx, new CreateNotification())

    const dto = new CreateTaskDTO({
      title: 'Org Task',
      status: TaskStatus.TODO,
      organization_id: org.id,
    })

    const task = await command.execute(dto)
    assert.equal(task.organization_id, org.id)
  })

  test('creates audit log after task creation', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const ctx = ExecutionContext.system(owner.id)
    const command = new CreateTaskCommand(ctx, new CreateNotification())

    const dto = new CreateTaskDTO({
      title: 'Audited Task',
      status: TaskStatus.TODO,
      organization_id: org.id,
    })

    const task = await command.execute(dto)

    const logs = await AuditLog.query().where('entity_type', 'task').where('entity_id', task.id)
    assert.isAbove(logs.length, 0)
    assert.equal(logs[0]!.action, 'create')
  })

  test('throws when user is not active', async ({ assert }) => {
    const inactiveUser = await UserFactory.create({ status: 'inactive' })
    const { org } = await OrganizationFactory.createWithOwner()
    const ctx = ExecutionContext.system(inactiveUser.id)
    const command = new CreateTaskCommand(ctx, new CreateNotification())

    const dto = new CreateTaskDTO({
      title: 'Should Fail',
      status: TaskStatus.TODO,
      organization_id: org.id,
    })

    await assert.rejects(() => command.execute(dto))
  })

  test('throws when org does not exist', async ({ assert }) => {
    const user = await UserFactory.create()
    const ctx = ExecutionContext.system(user.id)
    const command = new CreateTaskCommand(ctx, new CreateNotification())

    const dto = new CreateTaskDTO({
      title: 'Should Fail',
      status: TaskStatus.TODO,
      organization_id: 'non-existent-org-id',
    })

    await assert.rejects(() => command.execute(dto))
  })

  test('throws when user has no permission to create task', async ({ assert }) => {
    const { org } = await OrganizationFactory.createWithOwner()
    const outsider = await UserFactory.create()
    const ctx = ExecutionContext.system(outsider.id)
    const command = new CreateTaskCommand(ctx, new CreateNotification())

    const dto = new CreateTaskDTO({
      title: 'Should Fail',
      status: TaskStatus.TODO,
      organization_id: org.id,
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

    const ctx = ExecutionContext.system(owner.id)
    const command = new CreateTaskCommand(ctx, new CreateNotification())

    const dto = new CreateTaskDTO({
      title: 'Should Fail',
      status: TaskStatus.TODO,
      organization_id: org.id,
      project_id: project.id,
    })

    await assert.rejects(() => command.execute(dto))
  })

  test('assignee must be org member', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const outsider = await UserFactory.create()
    const ctx = ExecutionContext.system(owner.id)
    const command = new CreateTaskCommand(ctx, new CreateNotification())

    const dto = new CreateTaskDTO({
      title: 'Invalid Assignee',
      status: TaskStatus.TODO,
      organization_id: org.id,
      assigned_to: outsider.id,
    })

    await assert.rejects(() => command.execute(dto))
  })

  test('freelancer accepts assignment when is_freelancer is true', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const freelancer = await UserFactory.createFreelancer()
    const ctx = ExecutionContext.system(owner.id)
    const command = new CreateTaskCommand(ctx, new CreateNotification())

    const dto = new CreateTaskDTO({
      title: 'Freelancer Task',
      status: TaskStatus.TODO,
      organization_id: org.id,
      assigned_to: freelancer.id,
    })

    const task = await command.execute(dto)
    assert.equal(task.assigned_to, freelancer.id)
  })

  test('parent task must be same org', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const parentTask = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
    })
    const ctx = ExecutionContext.system(owner.id)
    const command = new CreateTaskCommand(ctx, new CreateNotification())

    const dto = new CreateTaskDTO({
      title: 'Child Task',
      status: TaskStatus.TODO,
      organization_id: org.id,
      parent_task_id: parentTask.id,
    })

    const task = await command.execute(dto)
    assert.equal(task.parent_task_id, parentTask.id)
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

    const ctx = ExecutionContext.system(manager.id)
    const command = new CreateTaskCommand(ctx, new CreateNotification())

    const dto = new CreateTaskDTO({
      title: 'Manager Task',
      status: TaskStatus.TODO,
      organization_id: org.id,
      project_id: project.id,
    })

    const task = await command.execute(dto)
    assert.equal(task.project_id, project.id)
  })

  test('task defaults status to todo', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const ctx = ExecutionContext.system(owner.id)
    const command = new CreateTaskCommand(ctx, new CreateNotification())

    const dto = new CreateTaskDTO({
      title: 'Default Status Task',
      status: TaskStatus.TODO,
      organization_id: org.id,
    })

    const task = await command.execute(dto)
    assert.equal(task.status, TaskStatus.TODO)
  })

  test('superadmin can create task in any org', async ({ assert }) => {
    const { org } = await OrganizationFactory.createWithOwner()
    const superadmin = await UserFactory.createSuperadmin()
    const ctx = ExecutionContext.system(superadmin.id)
    const command = new CreateTaskCommand(ctx, new CreateNotification())

    const dto = new CreateTaskDTO({
      title: 'Superadmin Task',
      status: TaskStatus.TODO,
      organization_id: org.id,
    })

    const task = await command.execute(dto)
    assert.isNotNull(task)
    assert.equal(task.creator_id, superadmin.id)
  })
})
