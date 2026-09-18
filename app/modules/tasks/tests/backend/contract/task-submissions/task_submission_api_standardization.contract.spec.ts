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
      status: 'submitted',
      submitted_at: new Date().toISOString(),
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
      .from('notification_fanout_targets as target')
      .join('notification_fanout_jobs as job', 'job.id', 'target.job_id')
      .whereIn('target.recipient_id', [owner.id, peerReviewer.id])
      .where('job.notification_type', BACKEND_NOTIFICATION_TYPES.REVIEW_REQUESTED)
      .select('target.recipient_id as user_id') as ReviewerNotificationRow[]

    assert.equal(persistedTask?.status, task.status)
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
})

