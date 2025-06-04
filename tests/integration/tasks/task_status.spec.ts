import { test } from '@japa/runner'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  UserFactory,
  OrganizationFactory,
  OrganizationUserFactory,
  TaskFactory,
  cleanupTestData,
} from '#tests/helpers/factories'
import UpdateTaskStatusCommand from '#actions/tasks/commands/update_task_status_command'
import UpdateTaskStatusDTO from '#actions/tasks/dtos/update_task_status_dto'
import CreateNotification from '#actions/common/create_notification'
import Task from '#models/task'
import { ExecutionContext } from '#types/execution_context'
import { TaskStatus } from '#constants/task_constants'

test.group('Integration | Task Status', (group) => {
  group.setup(() => setupApp())
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  async function createTaskInOrg() {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      status: TaskStatus.TODO,
    })
    return { org, owner, task }
  }

  test('todo → in_progress transition succeeds', async ({ assert }) => {
    const { owner, task } = await createTaskInOrg()
    const ctx = ExecutionContext.system(owner.id)
    const command = new UpdateTaskStatusCommand(ctx, new CreateNotification())

    const dto = new UpdateTaskStatusDTO({
      task_id: task.id,
      status: TaskStatus.IN_PROGRESS,
    })

    await command.execute(dto)

    const updated = await Task.findOrFail(task.id)
    assert.equal(updated.status, TaskStatus.IN_PROGRESS)
  })

  test('in_progress → in_review transition succeeds', async ({ assert }) => {
    const { owner, task } = await createTaskInOrg()
    await task.merge({ status: TaskStatus.IN_PROGRESS }).save()

    const ctx = ExecutionContext.system(owner.id)
    const command = new UpdateTaskStatusCommand(ctx, new CreateNotification())

    const dto = new UpdateTaskStatusDTO({
      task_id: task.id,
      status: TaskStatus.IN_REVIEW,
    })

    await command.execute(dto)

    const updated = await Task.findOrFail(task.id)
    assert.equal(updated.status, TaskStatus.IN_REVIEW)
  })

  test('in_review → done transition succeeds', async ({ assert }) => {
    const { owner, task } = await createTaskInOrg()
    await task.merge({ status: TaskStatus.IN_REVIEW }).save()

    const ctx = ExecutionContext.system(owner.id)
    const command = new UpdateTaskStatusCommand(ctx, new CreateNotification())

    const dto = new UpdateTaskStatusDTO({
      task_id: task.id,
      status: TaskStatus.DONE,
    })

    await command.execute(dto)

    const updated = await Task.findOrFail(task.id)
    assert.equal(updated.status, TaskStatus.DONE)
  })

  test('any status → cancelled transition succeeds', async ({ assert }) => {
    const { owner, task } = await createTaskInOrg()
    await task.merge({ status: TaskStatus.IN_PROGRESS }).save()

    const ctx = ExecutionContext.system(owner.id)
    const command = new UpdateTaskStatusCommand(ctx, new CreateNotification())

    const dto = new UpdateTaskStatusDTO({
      task_id: task.id,
      status: TaskStatus.CANCELLED,
    })

    await command.execute(dto)

    const updated = await Task.findOrFail(task.id)
    assert.equal(updated.status, TaskStatus.CANCELLED)
  })

  test('updated_by is set on status change', async ({ assert }) => {
    const { owner, task } = await createTaskInOrg()
    const ctx = ExecutionContext.system(owner.id)
    const command = new UpdateTaskStatusCommand(ctx, new CreateNotification())

    const dto = new UpdateTaskStatusDTO({
      task_id: task.id,
      status: TaskStatus.IN_PROGRESS,
    })

    await command.execute(dto)

    const updated = await Task.findOrFail(task.id)
    assert.equal(updated.updated_by, owner.id)
  })

  test('only permitted user can change status', async ({ assert }) => {
    const { org, task } = await createTaskInOrg()
    const outsider = await UserFactory.create()

    const ctx = ExecutionContext.system(outsider.id)
    const command = new UpdateTaskStatusCommand(ctx, new CreateNotification())

    const dto = new UpdateTaskStatusDTO({
      task_id: task.id,
      status: TaskStatus.IN_PROGRESS,
    })

    await assert.rejects(() => command.execute(dto))
  })

  test('org admin can change status of any task in org', async ({ assert }) => {
    const { org, task } = await createTaskInOrg()
    const admin = await UserFactory.create()
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: admin.id,
      org_role: 'org_admin',
      status: 'approved',
    })

    const ctx = ExecutionContext.system(admin.id)
    const command = new UpdateTaskStatusCommand(ctx, new CreateNotification())

    const dto = new UpdateTaskStatusDTO({
      task_id: task.id,
      status: TaskStatus.IN_PROGRESS,
    })

    await command.execute(dto)

    const updated = await Task.findOrFail(task.id)
    assert.equal(updated.status, TaskStatus.IN_PROGRESS)
  })

  test('audit log created on status change', async ({ assert }) => {
    const { owner, task } = await createTaskInOrg()
    const ctx = ExecutionContext.system(owner.id)
    const command = new UpdateTaskStatusCommand(ctx, new CreateNotification())

    const dto = new UpdateTaskStatusDTO({
      task_id: task.id,
      status: TaskStatus.IN_PROGRESS,
    })

    await command.execute(dto)

    const { default: AuditLog } = await import('#models/audit_log')
    const logs = await AuditLog.query()
      .where('entity_type', 'task')
      .where('entity_id', task.id)
      .where('action', 'update_status')
    assert.isAbove(logs.length, 0)
  })
})
