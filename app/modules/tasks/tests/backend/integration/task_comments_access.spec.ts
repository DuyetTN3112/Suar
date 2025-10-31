import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import ForbiddenException from '#modules/http/exceptions/forbidden_exception'
import CreateTaskCommentCommand from '#modules/tasks/actions/commands/create_task_comment_command'
import { makeSystemTaskActionContext } from '#modules/tasks/actions/task_action_context'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  cleanupTestData,
  OrganizationFactory,
  TaskFactory,
  UserFactory,
} from '#tests/helpers/factories'

test.group('Integration | Task comments access', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('outsider cannot comment on a task and no comment row is created', async ({
    assert,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const outsider = await UserFactory.create()
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      title: 'Private task discussion',
    })
    const body = 'Outsider should not comment here'

    await assert.rejects(
      () =>
        new CreateTaskCommentCommand(makeSystemTaskActionContext(outsider.id)).execute({
          task_id: task.id,
          body,
          comment_type: 'normal',
          visibility: 'internal',
        }),
      ForbiddenException
    )

    const comment = (await db
      .from('task_comments')
      .where('task_id', task.id)
      .where('body', body)
      .whereNull('deleted_at')
      .first()) as { id: string } | null

    assert.isNull(comment)
  })
})
