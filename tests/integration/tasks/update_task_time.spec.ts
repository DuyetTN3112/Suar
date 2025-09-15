import { test } from '@japa/runner'

import { MongoAuditLogModel } from '#modules/audit/infra/models/audit_log'
import UpdateTaskTimeCommand from '#modules/tasks/actions/commands/update_task_time_command'
import UpdateTaskTimeDTO from '#modules/tasks/actions/dtos/request/update_task_time_dto'
import { makeSystemTaskActionContext } from '#modules/tasks/actions/task_action_context'
import { taskExternalDeps } from '#modules/tasks/bootstrap/task_composition_root'
import { TaskCacheInvalidator } from '#modules/tasks/infra/cache/task_cache_invalidator'
import Task from '#modules/tasks/infra/models/task'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  cleanupTestData,
  OrganizationFactory,
  ProjectFactory,
  TaskFactory,
  UserFactory,
} from '#tests/helpers/factories'

async function countUpdateTimeAuditLogs(taskId: string): Promise<number> {
  const auditLogs = await MongoAuditLogModel.find({
    entity_type: 'task',
    entity_id: taskId,
    action: 'update_time',
  })
    .lean()
    .exec()

  return auditLogs.length
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
      new TaskCacheInvalidator()
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
      new TaskCacheInvalidator()
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
})
