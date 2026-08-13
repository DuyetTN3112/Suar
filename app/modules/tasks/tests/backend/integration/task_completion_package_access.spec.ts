import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import { taskExternalDeps } from '#composition/tasks/task-external-dependencies/task_external_dependencies_composition'
import ForbiddenException from '#modules/errors/public_contracts/forbidden_exception'
import { OrganizationUserStatus } from '#modules/organizations/public_contracts/access/organization_constants'
import DeleteTaskAttachmentCommand from '#modules/tasks/actions/commands/task-attachments/delete_task_attachment_command'
import DeleteTaskCommentCommand from '#modules/tasks/actions/commands/task-comments/delete_task_comment_command'
import {
  assertTaskCompletionPackageAccess,
  type TaskCompletionAccessTask,
} from '#modules/tasks/actions/task_completion_package_access'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  cleanupTestData,
  OrganizationFactory,
  OrganizationUserFactory,
  TaskFactory,
  UserFactory,
} from '#tests/helpers/factories'

function taskActionContext(userId: string, organizationId: string): TaskActionContext {
  return {
    userId,
    organizationId,
    ip: '127.0.0.1',
    userAgent: 'japa',
  }
}

test.group('Integration | Task completion package access', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('mutation guard refuses an approved member who does not own the resource', async ({
    assert,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const resourceOwner = await UserFactory.create()
    const approvedMember = await UserFactory.create()
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: approvedMember.id,
      status: OrganizationUserStatus.APPROVED,
    })
    const task: TaskCompletionAccessTask = {
      id: 'task-under-test',
      organization_id: org.id,
      creator_id: owner.id,
      assigned_to: null,
    }

    await assert.rejects(
      () =>
        assertTaskCompletionPackageAccess(
          taskActionContext(approvedMember.id, org.id),
          task,
          [resourceOwner.id],
          taskExternalDeps.org
        ),
      ForbiddenException
    )
  })

  test('read access still allows an approved member when no resource owners are supplied', async ({
    assert,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const approvedMember = await UserFactory.create()
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: approvedMember.id,
      status: OrganizationUserStatus.APPROVED,
    })
    const task: TaskCompletionAccessTask = {
      id: 'task-under-test',
      organization_id: org.id,
      creator_id: owner.id,
      assigned_to: null,
    }

    const actorId = await assertTaskCompletionPackageAccess(
      taskActionContext(approvedMember.id, org.id),
      task,
      [],
      taskExternalDeps.org
    )

    assert.equal(actorId, approvedMember.id)
  })

  test('mutation guard allows resource owner, task creator, and task assignee', async ({
    assert,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const resourceOwner = await UserFactory.create()
    const assignee = await UserFactory.create()
    const task: TaskCompletionAccessTask = {
      id: 'task-under-test',
      organization_id: org.id,
      creator_id: owner.id,
      assigned_to: assignee.id,
    }

    const allowedActorIds = await Promise.all([
      assertTaskCompletionPackageAccess(
        taskActionContext(resourceOwner.id, org.id),
        task,
        [resourceOwner.id],
        taskExternalDeps.org
      ),
      assertTaskCompletionPackageAccess(
        taskActionContext(owner.id, org.id),
        task,
        [resourceOwner.id],
        taskExternalDeps.org
      ),
      assertTaskCompletionPackageAccess(
        taskActionContext(assignee.id, org.id),
        task,
        [resourceOwner.id],
        taskExternalDeps.org
      ),
    ])

    assert.deepEqual(allowedActorIds, [resourceOwner.id, owner.id, assignee.id])
  })

  test('refused comment and attachment deletes leave both resources unchanged', async ({
    assert,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const resourceOwner = await UserFactory.create()
    const approvedMember = await UserFactory.create()
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: resourceOwner.id,
      status: OrganizationUserStatus.APPROVED,
    })
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: approvedMember.id,
      status: OrganizationUserStatus.APPROVED,
    })
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      assigned_to: null,
      title: 'Task communication ownership',
    })
    const insertedComments = (await db
      .table('task_comments')
      .insert({
        task_id: task.id,
        author_id: resourceOwner.id,
        body: 'Evidence comment must remain unchanged',
      })
      .returning(['id', 'body', 'updated_at', 'deleted_at'])) as Array<{
      id: string
      body: string
      updated_at: Date
      deleted_at: Date | null
    }>
    const comment = insertedComments[0]
    if (!comment) {
      throw new Error('Expected task comment fixture to be inserted')
    }

    const insertedAttachments = (await db
      .table('task_attachments')
      .insert({
        task_id: task.id,
        uploaded_by: resourceOwner.id,
        file_name: 'evidence.txt',
        file_path: 'https://example.com/evidence.txt',
      })
      .returning(['id', 'deleted_at'])) as Array<{ id: string; deleted_at: Date | null }>
    const attachment = insertedAttachments[0]
    if (!attachment) {
      throw new Error('Expected task attachment fixture to be inserted')
    }

    await assert.rejects(
      () =>
        new DeleteTaskCommentCommand(
          taskActionContext(approvedMember.id, org.id),
          taskExternalDeps
        ).execute({ comment_id: comment.id }),
      ForbiddenException
    )
    await assert.rejects(
      () =>
        new DeleteTaskAttachmentCommand(
          taskActionContext(approvedMember.id, org.id),
          taskExternalDeps
        ).execute({ attachment_id: attachment.id }),
      ForbiddenException
    )

    const unchangedComment = (await db
      .from('task_comments')
      .where('id', comment.id)
      .select('id', 'body', 'updated_at', 'deleted_at')
      .first()) as typeof comment | undefined
    const unchangedAttachment = (await db
      .from('task_attachments')
      .where('id', attachment.id)
      .select('id', 'deleted_at')
      .first()) as typeof attachment | undefined

    assert.deepEqual(unchangedComment, comment)
    assert.deepEqual(unchangedAttachment, attachment)

    await new DeleteTaskCommentCommand(
      taskActionContext(resourceOwner.id, org.id),
      taskExternalDeps
    ).execute({ comment_id: comment.id })
    await new DeleteTaskAttachmentCommand(
      taskActionContext(resourceOwner.id, org.id),
      taskExternalDeps
    ).execute({ attachment_id: attachment.id })

    const deletedComment = (await db
      .from('task_comments')
      .where('id', comment.id)
      .select('deleted_at')
      .first()) as { deleted_at: Date | null } | undefined
    const deletedAttachment = (await db
      .from('task_attachments')
      .where('id', attachment.id)
      .select('deleted_at')
      .first()) as { deleted_at: Date | null } | undefined

    assert.isNotNull(deletedComment?.deleted_at)
    assert.isNotNull(deletedAttachment?.deleted_at)
  })
})
