import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import { makeDeleteTaskCommand } from '#composition/organizations/tasks/task_notification_composition'
import { buildNotificationEventId } from '#modules/notifications/public_contracts/notification_event_identity'
import DeleteTaskDTO from '#modules/tasks/actions/dtos/request/delete_task_dto'
import type { TaskNotificationStager } from '#modules/tasks/actions/ports/outbound/task_notification_stager'
import { makeSystemTaskActionContext } from '#modules/tasks/actions/task_action_context'
import Task from '#modules/tasks/infra/models/task-authoring/task'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  cleanupTestData,
  OrganizationFactory,
  TaskFactory,
  UserFactory,
} from '#tests/helpers/factories'

class FailingNotificationStager implements TaskNotificationStager {
  public calls = 0

  public stage(): Promise<never> {
    this.calls += 1
    return Promise.reject(new Error('required notification staging failed'))
  }
}

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
    const invalidation = (await db
      .from('search_projection_entity_revisions')
      .where('entity_type', 'task')
      .where('entity_id', task.id)
      .where('operation', 'delete')
      .first()) as { source_revision?: string } | undefined
    assert.isNotEmpty(invalidation?.source_revision)
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

    await assert.rejects(
      () =>
        makeDeleteTaskCommand(makeSystemTaskActionContext(owner.id)).execute(
          new DeleteTaskDTO({ task_id: task.id })
        ),
      /review board/
    )

    const refreshed = await Task.find(task.id)
    assert.isNotNull(refreshed)
    assert.isNull(refreshed?.deleted_at)
  })

  test('required notification staging failure rolls back task deletion', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const assignee = await UserFactory.create()
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      assigned_to: assignee.id,
      title: 'Atomic delete',
    })
    const notification = new FailingNotificationStager()

    await assert.rejects(() =>
      makeDeleteTaskCommand(makeSystemTaskActionContext(owner.id), notification).execute(
        new DeleteTaskDTO({ task_id: task.id })
      )
    )

    const refreshed = await Task.find(task.id)
    assert.equal(notification.calls, 1)
    assert.isNotNull(refreshed)
    assert.isNull(refreshed?.deleted_at)
    const invalidationCount = (await db
      .from('search_projection_entity_revisions')
      .where('entity_id', task.id)
      .count('* as count')
      .first()) as { count?: number | string } | undefined
    assert.equal(Number(invalidationCount?.count ?? 0), 0)
  })

  test('stages one canonical notification and projection intent per distinct recipient', async ({
    assert,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const creator = await UserFactory.create()
    const assignee = await UserFactory.create()
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: creator.id,
      assigned_to: assignee.id,
      title: 'Notify before delete',
    })

    const result = await makeDeleteTaskCommand(makeSystemTaskActionContext(owner.id)).execute(
      new DeleteTaskDTO({ task_id: task.id, reason: 'No longer required' })
    )

    const notifications = (await db
      .from('notifications')
      .where('type', 'task_deleted')
      .where('related_entity_id', task.id)
      .orderBy('user_id', 'asc')) as Array<{
      user_id: string
      event_id: string
      action: unknown
      revision: number | string
    }>
    const outbox = await db.from('notification_outbox').whereIn(
      'source_event_id',
      notifications.map((notification) => notification.event_id)
    )

    assert.isTrue(result.success)
    assert.deepEqual(
      notifications.map((notification) => notification.user_id).sort(),
      [assignee.id, creator.id].sort()
    )
    for (const notification of notifications) {
      assert.equal(
        notification.event_id,
        buildNotificationEventId({
          eventName: 'task.deleted',
          businessEventId: task.id,
          recipientId: notification.user_id,
        })
      )
      assert.isNull(notification.action)
      assert.equal(Number(notification.revision), 1)
    }
    assert.lengthOf(outbox, 4)
  })
})
