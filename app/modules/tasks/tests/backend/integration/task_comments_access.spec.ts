import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import { taskExternalDeps } from '#composition/tasks/task-external-dependencies/task_external_dependencies_composition'
import ForbiddenException from '#modules/errors/public_contracts/forbidden_exception'
import { notificationFanoutPublicApi } from '#modules/notifications/public_contracts/notification_fanout'
import { ProjectRole } from '#modules/projects/public_contracts/project_constants'
import CreateTaskCommentCommand from '#modules/tasks/actions/commands/task-comments/create_task_comment_command'
import { makeSystemTaskActionContext } from '#modules/tasks/actions/task_action_context'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  cleanupTestData,
  OrganizationFactory,
  OrganizationUserFactory,
  ProjectFactory,
  ProjectMemberFactory,
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
        new CreateTaskCommentCommand(
          makeSystemTaskActionContext(outsider.id),
          taskExternalDeps,
          notificationFanoutPublicApi
        ).execute({
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

  test('a project viewer can comment without being the assignee', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const viewer = await UserFactory.create({ current_organization_id: org.id })
    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
    })
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: viewer.id,
      org_role: 'org_member',
      status: 'approved',
    })
    await ProjectMemberFactory.create({
      project_id: project.id,
      user_id: viewer.id,
      project_role: ProjectRole.VIEWER,
    })
    const task = await TaskFactory.create({
      organization_id: org.id,
      project_id: project.id,
      creator_id: owner.id,
      title: 'Viewer task discussion',
    })

    const created = await new CreateTaskCommentCommand(
      makeSystemTaskActionContext(viewer.id),
      taskExternalDeps,
      notificationFanoutPublicApi
    ).execute({
      task_id: task.id,
      body: 'Viewer can add useful context',
      comment_type: 'normal',
      visibility: 'internal',
    })

    assert.equal(created.author_id, viewer.id)
  })
})
