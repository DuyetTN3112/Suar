import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import { BACKEND_NOTIFICATION_TYPES } from '#modules/notifications/public_contracts/notification_constants'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  cleanupTestData,
  OrganizationFactory,
  OrganizationUserFactory,
  ProjectMemberFactory,
  TaskAssignmentFactory,
  TaskFactory,
  UserFactory,
} from '#tests/helpers/factories'
import { testId } from '#tests/helpers/test_utils'

test.group('Contract | Task comments API standardization', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('task comments endpoints accept camelCase input and return wrapped camelCase collection', async ({
    assert,
    client,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      assigned_to: owner.id,
      title: 'Task submission contract task',
    })
    await TaskAssignmentFactory.create({
      task_id: task.id,
      assignee_id: owner.id,
      assigned_by: owner.id,
      assignment_status: 'active',
    })
    const mentionedUser = await UserFactory.create({ current_organization_id: org.id })
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: mentionedUser.id,
      org_role: 'org_member',
      status: 'approved',
    })

    const createResponse = await client
      .post(`/api/tasks/${task.id}/comments`)
      .loginAs(owner)
      .json({
        body: `Canonical task comment @${owner.username}`,
        commentType: 'normal',
        visibility: 'internal',
        reviewRelevance: true,
      })

    createResponse.assertStatus(201)

    const createBody = createResponse.body() as {
      data: {
        id: string
        taskId: string
        authorId: string
        body: string
        commentType: string
        reviewRelevance: boolean
        mentions: { username: string }[]
        createdAt: string
      }
    }

    assert.notProperty(createBody, 'success')
    assert.equal(createBody.data.taskId, task.id)
    assert.equal(createBody.data.authorId, owner.id)
    assert.equal(createBody.data.body, `Canonical task comment @${owner.username}`)
    assert.equal(createBody.data.commentType, 'normal')
    assert.isTrue(createBody.data.reviewRelevance)
    assert.notProperty(createBody.data, 'task_id')
    assert.notProperty(createBody.data, 'author_id')

    const listResponse = await client.get(`/api/tasks/${task.id}/comments`).loginAs(owner)
    listResponse.assertStatus(200)

    const listBody = listResponse.body() as {
      data: {
        id: string
        taskId: string
        authorId: string
        authorUsername: string | null
        body: string
        commentType: string
        reviewRelevance: boolean
        mentions: { username: string }[]
        createdAt: string
      }[]
    }

    assert.notProperty(listBody, 'success')
    assert.isArray(listBody.data)
    assert.deepInclude(listBody.data[0] ?? {}, {
      taskId: task.id,
      authorId: owner.id,
      body: `Canonical task comment @${owner.username}`,
      commentType: 'normal',
      reviewRelevance: true,
    })
    const [comment] = listBody.data
    if (comment === undefined) {
      throw new Error('Expected canonical task comment')
    }
    const [mention] = comment.mentions
    if (mention === undefined) {
      throw new Error('Expected canonical task comment mention')
    }
    assert.equal(mention.username, owner.username)
    assert.notProperty(comment, 'task_id')
    assert.notProperty(comment, 'author_id')
    assert.notProperty(comment, 'comment_type')

    const commentId = createBody.data.id
    const updateResponse = await client
      .patch(`/api/tasks/${task.id}/comments/${commentId}`)
      .loginAs(owner)
      .json({
        body: `Updated task comment body @${mentionedUser.username}`,
        reviewRelevance: false,
      })

    updateResponse.assertStatus(200)

    const updateBody = updateResponse.body() as {
      data: {
        id: string
        body: string
        reviewRelevance: boolean
        editedAt: string | null
      }
    }

    assert.notProperty(updateBody, 'success')
    assert.equal(updateBody.data.id, commentId)
    assert.equal(updateBody.data.body, `Updated task comment body @${mentionedUser.username}`)
    assert.isFalse(updateBody.data.reviewRelevance)
    assert.isString(updateBody.data.editedAt)
    assert.notProperty(updateBody.data, 'review_relevance')
    assert.notProperty(updateBody.data, 'edited_at')

    const mentionNotifications = (await db
      .from('notification_fanout_targets as target')
      .join('notification_fanout_jobs as job', 'job.id', 'target.job_id')
      .where('target.recipient_id', mentionedUser.id)
      .where('job.notification_type', BACKEND_NOTIFICATION_TYPES.TASK_MENTIONED)
      .select('target.id')) as Array<{ id: string }>

    assert.lengthOf(mentionNotifications, 1)

    const deleteResponse = await client
      .delete(`/api/tasks/${task.id}/comments/${commentId}`)
      .loginAs(owner)

    deleteResponse.assertStatus(204)

    const listAfterDeleteResponse = await client.get(`/api/tasks/${task.id}/comments`).loginAs(owner)
    listAfterDeleteResponse.assertStatus(200)

    const listAfterDeleteBody = listAfterDeleteResponse.body() as {
      data: Array<{ id: string }>
    }

    assert.deepEqual(listAfterDeleteBody.data, [])
  })

  test('canonical v1 task comments endpoints preserve wrapped camelCase contract', async ({
    assert,
    client,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      assigned_to: owner.id,
      title: 'Task submission contract task v1 comments',
    })
    await TaskAssignmentFactory.create({
      task_id: task.id,
      assignee_id: owner.id,
      assigned_by: owner.id,
      assignment_status: 'active',
    })

    const createResponse = await client
      .post(`/api/v1/tasks/${task.id}/comments`)
      .loginAs(owner)
      .json({
        body: 'Canonical v1 task comment',
        commentType: 'normal',
        visibility: 'internal',
        reviewRelevance: true,
      })

    createResponse.assertStatus(201)

    const createBody = createResponse.body() as {
      data: {
        id: string
        taskId: string
        authorId: string
        body: string
        commentType: string
        reviewRelevance: boolean
      }
    }

    assert.notProperty(createBody, 'success')
    assert.equal(createBody.data.taskId, task.id)
    assert.equal(createBody.data.authorId, owner.id)
    assert.equal(createBody.data.body, 'Canonical v1 task comment')
    assert.equal(createBody.data.commentType, 'normal')
    assert.isTrue(createBody.data.reviewRelevance)

    const listResponse = await client.get(`/api/v1/tasks/${task.id}/comments`).loginAs(owner)
    listResponse.assertStatus(200)

    const listBody = listResponse.body() as {
      data: Array<{
        id: string
        taskId: string
        authorId: string
        body: string
        commentType: string
        reviewRelevance: boolean
      }>
    }

    assert.notProperty(listBody, 'success')
    assert.deepInclude(listBody.data[0] ?? {}, {
      taskId: task.id,
      authorId: owner.id,
      body: 'Canonical v1 task comment',
      commentType: 'normal',
      reviewRelevance: true,
    })

    const commentId = createBody.data.id
    const updateResponse = await client
      .patch(`/api/v1/tasks/${task.id}/comments/${commentId}`)
      .loginAs(owner)
      .json({
        body: 'Canonical v1 updated task comment',
        reviewRelevance: false,
      })

    updateResponse.assertStatus(200)

    const updateBody = updateResponse.body() as {
      data: {
        id: string
        body: string
        reviewRelevance: boolean
      }
    }

    assert.notProperty(updateBody, 'success')
    assert.equal(updateBody.data.id, commentId)
    assert.equal(updateBody.data.body, 'Canonical v1 updated task comment')
    assert.isFalse(updateBody.data.reviewRelevance)

    const deleteResponse = await client
      .delete(`/api/v1/tasks/${task.id}/comments/${commentId}`)
      .loginAs(owner)

    deleteResponse.assertStatus(204)
  })

  test('canonical v1 task comments list paginates by root discussion threads and keeps replies with their parent', async ({
    assert,
    client,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      assigned_to: owner.id,
      title: 'Paginated task comments',
    })
    await TaskAssignmentFactory.create({
      task_id: task.id,
      assignee_id: owner.id,
      assigned_by: owner.id,
      assignment_status: 'active',
    })

    const rootOneResponse = await client
      .post(`/api/v1/tasks/${task.id}/comments`)
      .loginAs(owner)
      .json({
        body: 'Root thread 1',
        commentType: 'normal',
        visibility: 'internal',
      })
    rootOneResponse.assertStatus(201)
    const rootOneId = (rootOneResponse.body() as { data: { id: string } }).data.id

    const rootTwoResponse = await client
      .post(`/api/v1/tasks/${task.id}/comments`)
      .loginAs(owner)
      .json({
        body: 'Root thread 2',
        commentType: 'normal',
        visibility: 'internal',
      })
    rootTwoResponse.assertStatus(201)
    const rootTwoId = (rootTwoResponse.body() as { data: { id: string } }).data.id

    const rootThreeResponse = await client
      .post(`/api/v1/tasks/${task.id}/comments`)
      .loginAs(owner)
      .json({
        body: 'Root thread 3',
        commentType: 'normal',
        visibility: 'internal',
      })
    rootThreeResponse.assertStatus(201)
    const rootThreeId = (rootThreeResponse.body() as { data: { id: string } }).data.id

    const replyResponse = await client
      .post(`/api/v1/tasks/${task.id}/comments`)
      .loginAs(owner)
      .json({
        parentCommentId: rootTwoId,
        body: 'Reply for root thread 2',
        commentType: 'clarification',
        visibility: 'internal',
      })
    replyResponse.assertStatus(201)
    const replyId = (replyResponse.body() as { data: { id: string } }).data.id

    const pagedResponse = await client
      .get(`/api/v1/tasks/${task.id}/comments?page=2&perPage=1`)
      .loginAs(owner)

    pagedResponse.assertStatus(200)

    const pagedBody = pagedResponse.body() as {
      data: Array<{ id: string; parentCommentId: string | null; body: string }>
      pagination: {
        mode: 'offset'
        page: number
        perPage: number
        total: number
        lastPage: number
        hasNextPage: boolean
        hasPreviousPage: boolean
        nextCursor: string | null
        previousCursor: string | null
      }
    }

    assert.deepEqual(
      pagedBody.data.map((comment) => ({
        id: comment.id,
        parentCommentId: comment.parentCommentId,
        body: comment.body,
      })),
      [
        {
          id: rootTwoId,
          parentCommentId: null,
          body: 'Root thread 2',
        },
        {
          id: replyId,
          parentCommentId: rootTwoId,
          body: 'Reply for root thread 2',
        },
      ]
    )
    assert.equal(pagedBody.pagination.mode, 'offset')
    assert.equal(pagedBody.pagination.page, 2)
    assert.equal(pagedBody.pagination.perPage, 1)
    assert.equal(pagedBody.pagination.total, 3)
    assert.equal(pagedBody.pagination.lastPage, 3)
    assert.equal(pagedBody.pagination.hasNextPage, true)
    assert.equal(pagedBody.pagination.hasPreviousPage, true)
    assert.isNull(pagedBody.pagination.nextCursor)
    assert.isNull(pagedBody.pagination.previousCursor)
    assert.notInclude(
      pagedBody.data.map((comment) => comment.id),
      rootOneId
    )
    assert.notInclude(
      pagedBody.data.map((comment) => comment.id),
      rootThreeId
    )
  })

  test('approved organization member can comment on task and review_note auto-marks review relevance', async ({
    assert,
    client,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const collaborator = await UserFactory.create({ current_organization_id: org.id })
    const outsider = await UserFactory.create()

    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: collaborator.id,
      org_role: 'org_member',
      status: 'approved',
    })

    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      assigned_to: owner.id,
      title: 'Cross member task comment access',
    })
    await TaskAssignmentFactory.create({
      task_id: task.id,
      assignee_id: owner.id,
      assigned_by: owner.id,
      assignment_status: 'active',
    })
    await ProjectMemberFactory.create({
      project_id: task.project_id ?? org.id,
      user_id: collaborator.id,
      project_role: 'project_member',
    })

    const collaboratorResponse = await client
      .post(`/api/v1/tasks/${task.id}/comments`)
      .loginAs(collaborator)
      .json({
        body: 'Review note from approved org member',
        commentType: 'review_note',
        visibility: 'internal',
      })

    collaboratorResponse.assertStatus(201)

    const collaboratorBody = collaboratorResponse.body() as {
      data: {
        authorId: string
        commentType: string
        reviewRelevance: boolean
      }
    }

    assert.equal(collaboratorBody.data.authorId, collaborator.id)
    assert.equal(collaboratorBody.data.commentType, 'review_note')
    assert.isTrue(collaboratorBody.data.reviewRelevance)

    const outsiderResponse = await client
      .post(`/api/v1/tasks/${task.id}/comments`)
      .loginAs(outsider)
      .json({
        body: 'Outsider should not comment',
        commentType: 'normal',
        visibility: 'internal',
      })

    outsiderResponse.assertStatus(403)
  })

  test('editing task comment only notifies newly mentioned users and does not spam existing mentions', async ({
    assert,
    client,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      assigned_to: owner.id,
      title: 'Task comment mention delta contract task',
    })
    await TaskAssignmentFactory.create({
      task_id: task.id,
      assignee_id: owner.id,
      assigned_by: owner.id,
      assignment_status: 'active',
    })

    const existingMentionedUser = await UserFactory.create({
      username: `existing_${testId().slice(0, 8)}`,
      current_organization_id: org.id,
    })
    const newMentionedUser = await UserFactory.create({
      username: `new_${testId().slice(0, 8)}`,
      current_organization_id: org.id,
    })

    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: existingMentionedUser.id,
      org_role: 'org_member',
      status: 'approved',
    })
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: newMentionedUser.id,
      org_role: 'org_member',
      status: 'approved',
    })

    const createResponse = await client
      .post(`/api/v1/tasks/${task.id}/comments`)
      .loginAs(owner)
      .json({
        body: `Initial comment mentioning @${existingMentionedUser.username}`,
        commentType: 'normal',
        visibility: 'internal',
      })

    createResponse.assertStatus(201)
    const commentId = (createResponse.body() as { data: { id: string } }).data.id

    const initialNotifications = (await db
      .from('notification_fanout_targets as target')
      .join('notification_fanout_jobs as job', 'job.id', 'target.job_id')
      .where('job.notification_type', BACKEND_NOTIFICATION_TYPES.TASK_MENTIONED)
      .whereIn('target.recipient_id', [existingMentionedUser.id, newMentionedUser.id])
      .select('target.id', 'target.recipient_id')) as Array<{ id: string; recipient_id: string }>

    assert.lengthOf(initialNotifications, 1)
    assert.equal(initialNotifications[0]?.recipient_id, existingMentionedUser.id)

    const updateResponse = await client
      .patch(`/api/v1/tasks/${task.id}/comments/${commentId}`)
      .loginAs(owner)
      .json({
        body: `Updated comment keeping @${existingMentionedUser.username} and adding @${newMentionedUser.username}`,
      })

    updateResponse.assertStatus(200)

    const totalNotifications = (await db
      .from('notification_fanout_targets as target')
      .join('notification_fanout_jobs as job', 'job.id', 'target.job_id')
      .where('job.notification_type', BACKEND_NOTIFICATION_TYPES.TASK_MENTIONED)
      .whereIn('target.recipient_id', [existingMentionedUser.id, newMentionedUser.id])
      .select('target.id', 'target.recipient_id')) as Array<{ id: string; recipient_id: string }>

    const existingUserCount = totalNotifications.filter(
      (item) => item.recipient_id === existingMentionedUser.id
    ).length
    const newUserCount = totalNotifications.filter(
      (item) => item.recipient_id === newMentionedUser.id
    ).length

    assert.equal(existingUserCount, 1)
    assert.equal(newUserCount, 1)
  })
})
