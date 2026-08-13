import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import { taskExternalDeps } from '#composition/tasks/task-external-dependencies/task_external_dependencies_composition'
import {
  notificationFanoutPublicApi,
  type NotificationFanoutStagerContract,
} from '#modules/notifications/public_contracts/notification_fanout'
import CreateTaskCommentCommand from '#modules/tasks/actions/commands/task-comments/create_task_comment_command'
import { makeSystemTaskActionContext } from '#modules/tasks/actions/task_action_context'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  cleanupTestData,
  OrganizationFactory,
  OrganizationUserFactory,
  TaskFactory,
  UserFactory,
} from '#tests/helpers/factories'

async function cleanupNotificationData(): Promise<void> {
  await db.from('notification_fanout_targets').delete()
  await db.from('notification_fanout_jobs').delete()
}

test.group('Integration | Task Comment Notification Atomicity', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(async () => {
    await cleanupNotificationData()
    await cleanupTestData()
  })

  test('rolls comment and mention rows back when fanout staging fails', async ({
    assert,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const mentioned = await UserFactory.create({ current_organization_id: org.id })
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: mentioned.id,
      org_role: 'org_member',
      status: 'approved',
    })
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      assigned_to: owner.id,
      title: 'Atomic comment notification',
    })
    const failingFanout: NotificationFanoutStagerContract = {
      stage: () => Promise.reject(new Error('simulated fanout staging failure')),
    }

    await assert.rejects(
      () =>
        new CreateTaskCommentCommand(
          makeSystemTaskActionContext(owner.id),
          taskExternalDeps,
          failingFanout
        ).execute({
          task_id: task.id,
          body: `Please review @${mentioned.username}`,
          comment_type: 'normal',
          visibility: 'internal',
        }),
      /simulated fanout staging failure/
    )

    const comment = (await db
      .from('task_comments')
      .where('task_id', task.id)
      .where('body', `Please review @${mentioned.username}`)
      .first()) as { id: string } | null
    assert.isNull(comment)
    assert.equal(
      Number(
        (
          (await db.from('task_comment_mentions').count('* as count').first()) as {
            count: number | string
          }
        ).count
      ),
      0
    )
  })

  test('commits the comment, mention snapshot, and durable fanout job together', async ({
    assert,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const mentioned = await UserFactory.create({ current_organization_id: org.id })
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: mentioned.id,
      org_role: 'org_member',
      status: 'approved',
    })
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      assigned_to: owner.id,
      title: 'Durable comment fanout',
    })

    const comment = await new CreateTaskCommentCommand(
      makeSystemTaskActionContext(owner.id),
      taskExternalDeps,
      notificationFanoutPublicApi
    ).execute({
      task_id: task.id,
      body: `Please review @${mentioned.username}`,
      comment_type: 'normal',
      visibility: 'internal',
    })

    const job = (await db
      .from('notification_fanout_jobs')
      .where('business_event_id', comment.id)
      .first()) as Record<string, unknown> | undefined
    assert.equal(job?.['source_event_name'], 'task.comment_mentioned')
    assert.equal(Number(job?.['target_count']), 1)
    const jobId = job?.['id']
    assert.isString(jobId)
    const targetCount = await db
      .from('notification_fanout_targets')
      .where('job_id', jobId as string)
      .count('* as count')
      .then((row) => Number((row[0] as { count: string }).count))
    const canonicalCount = await db
      .from('notifications')
      .where('user_id', mentioned.id)
      .count('* as count')
      .then((row) => Number((row[0] as { count: string }).count))
    assert.equal(targetCount, 1)
    assert.equal(canonicalCount, 0)
  })
})
