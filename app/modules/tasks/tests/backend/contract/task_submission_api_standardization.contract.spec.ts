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

interface PersistedTaskRow {
  status: string
}

interface ReviewSessionRow {
  id: string
  reviewee_id: string
  creator_reviewer_id: string | null
}

interface ReviewerNotificationRow {
  user_id: string
}

async function createSubmissionScenario() {
  const { org, owner } = await OrganizationFactory.createWithOwner()
  const task = await TaskFactory.create({
    organization_id: org.id,
    creator_id: owner.id,
    assigned_to: owner.id,
    title: 'Task submission contract task',
  })
  const assignment = await TaskAssignmentFactory.create({
    task_id: task.id,
    assignee_id: owner.id,
    assigned_by: owner.id,
    assignment_status: 'active',
  })

  return { owner, task, assignment }
}

test.group('Contract | Task submission API standardization', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('submission show endpoint returns wrapped nullable data without success envelope', async ({
    assert,
    client,
  }) => {
    const { owner, task } = await createSubmissionScenario()

    const response = await client.get(`/api/tasks/${task.id}/submission`).loginAs(owner)
    response.assertStatus(200)

    const body = response.body() as {
      data: Record<string, unknown> | null
    }

    assert.notProperty(body, 'success')
    assert.deepEqual(body, { data: null })
  })

  test('submission save-draft endpoint returns wrapped data without success envelope', async ({
    assert,
    client,
  }) => {
    const { owner, task } = await createSubmissionScenario()

    const response = await client.post(`/api/tasks/${task.id}/submission`).loginAs(owner).json({
      summary: 'Draft summary',
      implementationNotes: 'Implementation details',
      evidences: [],
    })

    response.assertStatus(200)

    const body = response.body() as {
      data: {
        taskId: string
        submittedBy: string
        summary: string
        status: string
        implementationNotes: string | null
      }
    }

    assert.notProperty(body, 'success')
    assert.equal(body.data.taskId, task.id)
    assert.equal(body.data.submittedBy, owner.id)
    assert.equal(body.data.summary, 'Draft summary')
    assert.equal(body.data.status, 'draft')
    assert.equal(body.data.implementationNotes, 'Implementation details')
    assert.notProperty(body.data, 'task_id')
    assert.notProperty(body.data, 'submitted_by')
    assert.notProperty(body.data, 'implementation_notes')
  })

  test('canonical v1 submission save-draft endpoint preserves legacy wrapped camelCase contract', async ({
    assert,
    client,
  }) => {
    const { owner, task } = await createSubmissionScenario()

    const response = await client.post(`/api/v1/tasks/${task.id}/submission`).loginAs(owner).json({
      summary: 'Draft summary v1',
      implementationNotes: 'Implementation details v1',
      evidences: [],
    })

    response.assertStatus(200)

    const body = response.body() as {
      data: {
        taskId: string
        submittedBy: string
        summary: string
        status: string
        implementationNotes: string | null
      }
    }

    assert.notProperty(body, 'success')
    assert.equal(body.data.taskId, task.id)
    assert.equal(body.data.submittedBy, owner.id)
    assert.equal(body.data.summary, 'Draft summary v1')
    assert.equal(body.data.status, 'draft')
    assert.equal(body.data.implementationNotes, 'Implementation details v1')
    assert.notProperty(body.data, 'task_id')
    assert.notProperty(body.data, 'submitted_by')
    assert.notProperty(body.data, 'implementation_notes')
  })

  test('submission lock endpoint returns wrapped data without success envelope', async ({
    assert,
    client,
  }) => {
    const { owner, task, assignment } = await createSubmissionScenario()
    const submissionId = testId()

    await db.table('task_submissions').insert({
      id: submissionId,
      task_assignment_id: assignment.id,
      task_id: task.id,
      submitted_by: owner.id,
      summary: 'Ready to lock',
      status: 'draft',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    const response = await client.post(`/api/tasks/${task.id}/submission/lock`).loginAs(owner)
    response.assertStatus(200)

    const body = response.body() as {
      data: {
        id: string
        status: string
      }
    }

    assert.notProperty(body, 'success')
    assert.equal(body.data.id, submissionId)
    assert.equal(body.data.status, 'locked')
  })

  test('submission evidences endpoint returns wrapped data collection without success envelope', async ({
    assert,
    client,
  }) => {
    const { owner, task, assignment } = await createSubmissionScenario()
    const submissionId = testId()

    await db.table('task_submissions').insert({
      id: submissionId,
      task_assignment_id: assignment.id,
      task_id: task.id,
      submitted_by: owner.id,
      summary: 'Submission with evidence',
      status: 'draft',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    await db.table('task_submission_evidences').insert({
      id: testId(),
      submission_id: submissionId,
      evidence_type: 'pull_request',
      url: 'https://example.com/pr/1',
      title: 'PR link',
      description: 'Primary proof',
      uploaded_by: owner.id,
      created_at: new Date().toISOString(),
    })

    await owner.refresh()

    const response = await client
      .get(`/api/task-submissions/${submissionId}/evidences`)
      .loginAs(owner)
    response.assertStatus(200)

    const body = response.body() as {
      data: {
        submissionId: string
        evidenceType: string
        url: string
      }[]
    }

    assert.notProperty(body, 'success')
    assert.isArray(body.data)
    assert.deepInclude(body.data[0] ?? {}, {
      submissionId: submissionId,
      evidenceType: 'pull_request',
      url: 'https://example.com/pr/1',
    })
    assert.notProperty(body.data[0] ?? {}, 'submission_id')
    assert.notProperty(body.data[0] ?? {}, 'evidence_type')
  })

  test('canonical v1 submission evidences endpoint preserves legacy wrapped camelCase contract', async ({
    assert,
    client,
  }) => {
    const { owner, task, assignment } = await createSubmissionScenario()
    const submissionId = testId()

    await db.table('task_submissions').insert({
      id: submissionId,
      task_assignment_id: assignment.id,
      task_id: task.id,
      submitted_by: owner.id,
      summary: 'Submission with evidence v1',
      status: 'draft',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    await db.table('task_submission_evidences').insert({
      id: testId(),
      submission_id: submissionId,
      evidence_type: 'pull_request',
      url: 'https://example.com/pr/v1',
      title: 'PR link v1',
      description: 'Primary proof v1',
      uploaded_by: owner.id,
      created_at: new Date().toISOString(),
    })

    await owner.refresh()

    const response = await client
      .get(`/api/v1/task-submissions/${submissionId}/evidences`)
      .loginAs(owner)
    response.assertStatus(200)

    const body = response.body() as {
      data: {
        submissionId: string
        evidenceType: string
        url: string
      }[]
    }

    assert.notProperty(body, 'success')
    assert.isArray(body.data)
    assert.deepInclude(body.data[0] ?? {}, {
      submissionId,
      evidenceType: 'pull_request',
      url: 'https://example.com/pr/v1',
    })
    assert.notProperty(body.data[0] ?? {}, 'submission_id')
    assert.notProperty(body.data[0] ?? {}, 'evidence_type')
  })

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
      .from('notifications')
      .where('user_id', mentionedUser.id)
      .where('type', BACKEND_NOTIFICATION_TYPES.TASK_MENTIONED)
      .select('id')) as Array<{ id: string }>

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
        body: 'Outsider should not comment here',
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
    const firstMentionedUser = await UserFactory.create({ current_organization_id: org.id })
    const secondMentionedUser = await UserFactory.create({ current_organization_id: org.id })

    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: firstMentionedUser.id,
      org_role: 'org_member',
      status: 'approved',
    })
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: secondMentionedUser.id,
      org_role: 'org_member',
      status: 'approved',
    })

    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      assigned_to: owner.id,
      title: 'Mention notification dedupe task',
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
        body: `Initial mention @${firstMentionedUser.username}`,
        commentType: 'normal',
        visibility: 'internal',
      })

    createResponse.assertStatus(201)

    const commentId = (createResponse.body() as { data: { id: string } }).data.id

    const firstUpdateResponse = await client
      .patch(`/api/v1/tasks/${task.id}/comments/${commentId}`)
      .loginAs(owner)
      .json({
        body: `Mention stays @${firstMentionedUser.username} and adds @${secondMentionedUser.username}`,
      })

    firstUpdateResponse.assertStatus(200)

    const secondUpdateResponse = await client
      .patch(`/api/v1/tasks/${task.id}/comments/${commentId}`)
      .loginAs(owner)
      .json({
        body: `Mention stays @${firstMentionedUser.username} and @${secondMentionedUser.username}`,
      })

    secondUpdateResponse.assertStatus(200)

    const notifications = (await db
      .from('notifications')
      .whereIn('user_id', [firstMentionedUser.id, secondMentionedUser.id])
      .where('type', BACKEND_NOTIFICATION_TYPES.TASK_MENTIONED)
      .select('user_id')) as Array<{ user_id: string }>

    assert.deepEqual(
      notifications.reduce<Record<string, number>>((counts, row) => {
        counts[row.user_id] = (counts[row.user_id] ?? 0) + 1
        return counts
      }, {}),
      {
        [firstMentionedUser.id]: 1,
        [secondMentionedUser.id]: 1,
      }
    )
  })

  test('submission submit endpoint creates review session and reviewer notifications', async ({
    assert,
    client,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const assignee = await UserFactory.create({ current_organization_id: org.id })
    const peerReviewer = await UserFactory.create({ current_organization_id: org.id })

    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: assignee.id,
      org_role: 'org_member',
      status: 'approved',
    })
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: peerReviewer.id,
      org_role: 'org_member',
      status: 'approved',
    })

    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      assigned_to: assignee.id,
      title: 'Task ready for review queue',
    })
    if (!task.project_id) {
      throw new Error('Expected task.project_id for review queue scenario')
    }

    await ProjectMemberFactory.create({
      project_id: task.project_id,
      user_id: peerReviewer.id,
      project_role: 'project_member',
    })

    const assignment = await TaskAssignmentFactory.create({
      task_id: task.id,
      assignee_id: assignee.id,
      assigned_by: owner.id,
      assignment_status: 'active',
    })

    const response = await client
      .post(`/api/tasks/${task.id}/submission/submit`)
      .loginAs(assignee)
      .json({
        summary: 'Ready for review',
        implementationNotes: 'Implemented and verified',
        evidences: [
          {
            evidenceType: 'pull_request',
            url: 'https://example.com/pr/ready-for-review',
            title: 'PR',
          },
        ],
      })

    response.assertStatus(200)

    const persistedTask = (await db
      .from('tasks')
      .where('id', task.id)
      .first()) as PersistedTaskRow | null
    const reviewSession = await db
      .from('review_sessions')
      .where('task_assignment_id', assignment.id)
      .first() as ReviewSessionRow | null
    let reviewerAssignments: Array<{
      reviewer_id: string
      reviewer_type: string
      is_required: boolean
      status: string
      due_at: string | null
    }> = []
    if (reviewSession) {
      reviewerAssignments = (await db
        .from('review_session_reviewer_assignments')
        .where('review_session_id', reviewSession.id)
        .select('reviewer_id', 'reviewer_type', 'is_required', 'status', 'due_at')) as Array<{
        reviewer_id: string
        reviewer_type: string
        is_required: boolean
        status: string
        due_at: string | null
      }>
    }
    const reviewerNotifications = await db
      .from('notifications')
      .whereIn('user_id', [owner.id, peerReviewer.id])
      .where('type', BACKEND_NOTIFICATION_TYPES.REVIEW_REQUESTED)
      .select('user_id') as ReviewerNotificationRow[]

    assert.equal(persistedTask?.status, 'in_review')
    assert.exists(reviewSession)
    assert.equal(reviewSession?.reviewee_id, assignee.id)
    assert.equal(reviewSession?.creator_reviewer_id, owner.id)
    assert.isAtLeast(reviewerAssignments.length, 2)
    assert.sameMembers(
      reviewerAssignments.map((assignmentItem) => assignmentItem.reviewer_id),
      [owner.id, peerReviewer.id]
    )
    assert.isTrue(reviewerAssignments.every((assignmentItem) => assignmentItem.status === 'pending'))
    assert.isTrue(reviewerAssignments.every((assignmentItem) => assignmentItem.due_at !== null))
    assert.sameMembers(
      reviewerNotifications.map((notification) => notification.user_id),
      [owner.id, peerReviewer.id]
    )
  })

  test('submission submit endpoint falls back creator-required reviewer to assigner when creator is reviewee', async ({
    assert,
    client,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const reviewee = await UserFactory.create({ current_organization_id: org.id })
    const peerReviewer = await UserFactory.create({ current_organization_id: org.id })

    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: reviewee.id,
      org_role: 'org_member',
      status: 'approved',
    })
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: peerReviewer.id,
      org_role: 'org_member',
      status: 'approved',
    })

    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: reviewee.id,
      assigned_to: reviewee.id,
      title: 'Self-authored task ready for review queue',
    })
    if (!task.project_id) {
      throw new Error('Expected task.project_id for self-authored review scenario')
    }

    await ProjectMemberFactory.create({
      project_id: task.project_id,
      user_id: peerReviewer.id,
      project_role: 'project_member',
    })

    const assignment = await TaskAssignmentFactory.create({
      task_id: task.id,
      assignee_id: reviewee.id,
      assigned_by: owner.id,
      assignment_status: 'active',
    })

    const response = await client
      .post(`/api/tasks/${task.id}/submission/submit`)
      .loginAs(reviewee)
      .json({
        summary: 'Ready for review',
        evidences: [
          {
            evidenceType: 'pull_request',
            url: 'https://example.com/pr/self-authored-review',
            title: 'PR',
          },
        ],
      })

    response.assertStatus(200)

    const reviewSession = await db
      .from('review_sessions')
      .where('task_assignment_id', assignment.id)
      .first() as ReviewSessionRow | null
    const reviewerAssignments = reviewSession
      ? ((await db
          .from('review_session_reviewer_assignments')
          .where('review_session_id', reviewSession.id)
          .select('reviewer_id', 'assignment_role')) as Array<{
          reviewer_id: string
          assignment_role: string
        }>)
      : []

    assert.exists(reviewSession)
    assert.equal(reviewSession?.creator_reviewer_id, owner.id)
    assert.deepInclude(reviewerAssignments, {
      reviewer_id: owner.id,
      assignment_role: 'creator_required',
    })
    assert.notDeepInclude(reviewerAssignments, {
      reviewer_id: reviewee.id,
      assignment_role: 'creator_required',
    })
  })

  test('task attachments endpoints accept camelCase input and return wrapped camelCase collection', async ({
    assert,
    client,
  }) => {
    const { owner, task } = await createSubmissionScenario()

    const createResponse = await client
      .post(`/api/tasks/${task.id}/attachments`)
      .loginAs(owner)
      .json({
        fileName: 'design-doc.pdf',
        filePath: 'https://example.com/design-doc.pdf',
        fileSize: 4096,
        mimeType: 'application/pdf',
        attachmentType: 'reference',
      })

    createResponse.assertStatus(201)

    const createBody = createResponse.body() as {
      data: {
        id: string
        taskId: string
        fileName: string
        filePath: string
        fileSize: number | null
        mimeType: string | null
        attachmentType: string
        uploadedBy: string
        createdAt: string
      }
    }

    assert.notProperty(createBody, 'success')
    assert.equal(createBody.data.taskId, task.id)
    assert.equal(createBody.data.fileName, 'design-doc.pdf')
    assert.equal(createBody.data.filePath, 'https://example.com/design-doc.pdf')
    assert.equal(createBody.data.fileSize, 4096)
    assert.equal(createBody.data.mimeType, 'application/pdf')
    assert.equal(createBody.data.attachmentType, 'reference')
    assert.equal(createBody.data.uploadedBy, owner.id)
    assert.notProperty(createBody.data, 'file_name')
    assert.notProperty(createBody.data, 'uploaded_by')

    const listResponse = await client.get(`/api/tasks/${task.id}/attachments`).loginAs(owner)
    listResponse.assertStatus(200)

    const listBody = listResponse.body() as {
      data: {
        id: string
        taskId: string
        fileName: string
        filePath: string
        fileSize: number | null
        mimeType: string | null
        attachmentType: string
        uploadedBy: string
        uploadedByUsername: string | null
        createdAt: string
      }[]
    }

    assert.notProperty(listBody, 'success')
    assert.isArray(listBody.data)
    assert.deepInclude(listBody.data[0] ?? {}, {
      taskId: task.id,
      fileName: 'design-doc.pdf',
      filePath: 'https://example.com/design-doc.pdf',
      attachmentType: 'reference',
      uploadedBy: owner.id,
    })
    assert.notProperty(listBody.data[0] ?? {}, 'file_name')
    assert.notProperty(listBody.data[0] ?? {}, 'attachment_type')
    assert.notProperty(listBody.data[0] ?? {}, 'uploaded_by')
  })

  test('canonical v1 task attachments endpoints preserve wrapped camelCase contract', async ({
    assert,
    client,
  }) => {
    const { owner, task } = await createSubmissionScenario()

    const createResponse = await client
      .post(`/api/v1/tasks/${task.id}/attachments`)
      .loginAs(owner)
      .json({
        fileName: 'design-doc-v1.pdf',
        filePath: 'https://example.com/design-doc-v1.pdf',
        fileSize: 8192,
        mimeType: 'application/pdf',
        attachmentType: 'reference',
      })

    createResponse.assertStatus(201)

    const createBody = createResponse.body() as {
      data: {
        id: string
        taskId: string
        fileName: string
        filePath: string
        fileSize: number | null
        mimeType: string | null
        attachmentType: string
        uploadedBy: string
      }
    }

    assert.notProperty(createBody, 'success')
    assert.equal(createBody.data.taskId, task.id)
    assert.equal(createBody.data.fileName, 'design-doc-v1.pdf')
    assert.equal(createBody.data.filePath, 'https://example.com/design-doc-v1.pdf')
    assert.equal(createBody.data.fileSize, 8192)
    assert.equal(createBody.data.mimeType, 'application/pdf')
    assert.equal(createBody.data.attachmentType, 'reference')
    assert.equal(createBody.data.uploadedBy, owner.id)

    const listResponse = await client.get(`/api/v1/tasks/${task.id}/attachments`).loginAs(owner)
    listResponse.assertStatus(200)

    const listBody = listResponse.body() as {
      data: Array<{
        id: string
        taskId: string
        fileName: string
        filePath: string
        attachmentType: string
        uploadedBy: string
      }>
    }

    assert.notProperty(listBody, 'success')
    assert.deepInclude(listBody.data[0] ?? {}, {
      taskId: task.id,
      fileName: 'design-doc-v1.pdf',
      filePath: 'https://example.com/design-doc-v1.pdf',
      attachmentType: 'reference',
      uploadedBy: owner.id,
    })

    const attachmentId = createBody.data.id
    const deleteResponse = await client
      .delete(`/api/v1/tasks/${task.id}/attachments/${attachmentId}`)
      .loginAs(owner)

    deleteResponse.assertStatus(204)
  })
})
