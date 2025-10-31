import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import DeleteTaskDTO from '#modules/tasks/actions/dtos/request/delete_task_dto'
import { makeSystemTaskActionContext } from '#modules/tasks/actions/task_action_context'
import { makeDeleteTaskCommand } from '#modules/tasks/bootstrap/task_action_factory'
import Task from '#modules/tasks/infra/models/task'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { cleanupTestData, OrganizationFactory, TaskFactory } from '#tests/helpers/factories'

test.group('Integration | Delete task HTTP standardization', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('inertia delete route returns 204 without success envelope and soft deletes task', async ({
    assert,
    client,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      assigned_to: owner.id,
      title: 'Delete me',
    })

    const response = await client
      .delete(`/tasks/${task.id}`)
      .loginAs(owner)
      .header('X-Inertia', 'true')

    response.assertStatus(204)

    const refreshed = await Task.find(task.id)
    assert.isNotNull(refreshed)
    assert.isNotNull(refreshed?.deleted_at)
  })

  test('delete command refuses tasks already visible in task review board', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      assigned_to: owner.id,
      title: 'Do not delete reviewed task',
    })

    await db.table('task_review_workflows').insert({
      task_id: task.id,
      project_id: task.project_id,
      organization_id: org.id,
      reviewee_id: owner.id,
      status: 'awaiting_review',
      required_review_count: 2,
      completed_review_count: 0,
    })

    const result = await makeDeleteTaskCommand(makeSystemTaskActionContext(owner.id)).execute(
      new DeleteTaskDTO({ task_id: task.id })
    )

    assert.isFalse(result.success)
    assert.include(result.message, 'review board')

    const refreshed = await Task.find(task.id)
    assert.isNotNull(refreshed)
    assert.isNull(refreshed?.deleted_at)
  })
})
