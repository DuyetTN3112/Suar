import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  cleanupTestData,
  OrganizationFactory,
  OrganizationUserFactory,
  ProjectFactory,
  ReviewSessionFactory,
  TaskAssignmentFactory,
  TaskFactory,
  UserFactory,
} from '#tests/helpers/factories'
import { testId } from '#tests/helpers/test_utils'

async function buildReviewSessionScenario() {
  const { org, owner } = await OrganizationFactory.createWithOwner()
  const reviewee = await UserFactory.create({ current_organization_id: org.id })
  await OrganizationUserFactory.create({
    organization_id: org.id,
    user_id: reviewee.id,
    org_role: 'org_member',
    status: 'approved',
  })
  const project = await ProjectFactory.create({
    organization_id: org.id,
    creator_id: owner.id,
    owner_id: owner.id,
  })
  const task = await TaskFactory.create({
    organization_id: org.id,
    creator_id: owner.id,
    project_id: project.id,
    assigned_to: reviewee.id,
    title: 'Inherited review API task',
  })
  const assignment = await TaskAssignmentFactory.create({
    task_id: task.id,
    assignee_id: reviewee.id,
    assigned_by: owner.id,
    assignment_status: 'completed',
  })
  const session = await ReviewSessionFactory.create({
    task_assignment_id: assignment.id,
    reviewee_id: reviewee.id,
    status: 'completed',
  })

  return { org, owner, reviewee, project, task, assignment, session }
}

test.group('Integration | Review inherited data API standardization', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('add review evidence accepts camelCase body and returns wrapped camelCase data', async ({
    assert,
    client,
  }) => {
    const { reviewee, session } = await buildReviewSessionScenario()

    const response = await client
      .post(`/reviews/${session.id}/evidences`)
      .loginAs(reviewee)
      .json({
        evidenceType: 'document_link',
        url: 'https://example.com/evidence',
        title: 'Spec doc',
        description: 'Support context',
      })

    response.assertStatus(201)

    const body = response.body() as {
      data: {
        reviewSessionId: string
        evidenceType: string
        uploadedBy: string
        url: string
      }
    }

    assert.notProperty(body, 'success')
    assert.equal(body.data.reviewSessionId, session.id)
    assert.equal(body.data.evidenceType, 'document_link')
    assert.equal(body.data.uploadedBy, reviewee.id)
    assert.equal(body.data.url, 'https://example.com/evidence')
  })

  test('review evidence read merges review and task submission evidence with origin labels', async ({
    assert,
    client,
  }) => {
    const { reviewee, owner, session, assignment, task } = await buildReviewSessionScenario()
    const [submission] = (await db
      .table('task_submissions')
      .insert({
        task_assignment_id: assignment.id,
        task_id: task.id,
        submitted_by: reviewee.id,
        summary: 'Submitted implementation package',
        status: 'submitted',
        submitted_at: '2026-01-01T00:00:00.000Z',
      })
      .returning('id')) as Array<{ id: string }>

    if (!submission) {
      throw new Error('Expected task submission fixture')
    }

    await db.table('task_submission_evidences').insert([
      {
        id: testId(),
        submission_id: submission.id,
        evidence_type: 'pull_request',
        url: 'https://example.com/shared',
        title: 'Shared evidence',
        description: 'Worker attached this first',
        uploaded_by: reviewee.id,
        created_at: '2026-01-01T00:00:00.000Z',
      },
      {
        id: testId(),
        submission_id: submission.id,
        evidence_type: 'demo_recording',
        url: 'https://example.com/demo',
        title: 'Demo recording',
        description: 'Submission-only evidence',
        uploaded_by: reviewee.id,
        created_at: '2026-01-01T00:01:00.000Z',
      },
    ])
    await db.table('review_evidences').insert({
      id: testId(),
      review_session_id: session.id,
      evidence_type: 'pull_request',
      url: 'https://example.com/shared',
      title: 'Shared evidence',
      description: 'Reviewer reused this evidence',
      uploaded_by: owner.id,
      verification_status: 'pending',
      is_sensitive: false,
      created_at: '2026-01-01T00:02:00.000Z',
      updated_at: '2026-01-01T00:02:00.000Z',
    })

    const response = await client.get(`/reviews/${session.id}/evidences`).loginAs(reviewee)

    response.assertStatus(200)
    const body = response.body() as {
      data: Array<{
        title: string
        origin: string
        origins: string[]
        reviewSessionId: string
        evidenceType: string
      }>
    }

    assert.lengthOf(body.data, 2)
    const shared = body.data.find((item) => item.title === 'Shared evidence')
    const submissionOnly = body.data.find((item) => item.title === 'Demo recording')

    assert.exists(shared)
    assert.sameMembers(shared?.origins ?? [], ['submission', 'review'])
    assert.equal(shared?.reviewSessionId, session.id)
    assert.equal(shared?.evidenceType, 'pull_request')
    assert.exists(submissionOnly)
    assert.equal(submissionOnly?.origin, 'submission')
    assert.deepEqual(submissionOnly?.origins, ['submission'])
  })

  test('create reverse review is rejected because task-level reverse review is deprecated', async ({
    assert,
    client,
  }) => {
    const { reviewee, owner, session } = await buildReviewSessionScenario()

    const response = await client
      .post(`/api/review-sessions/${session.id}/reverse-reviews`)
      .loginAs(reviewee)
      .json({
        targetType: 'manager',
        targetId: owner.id,
        rating: 5,
        comment: 'Clear direction',
        isAnonymous: true,
    })

    response.assertStatus(400)
    assert.include(JSON.stringify(response.body()), 'Review theo task đã tắt')
  })

  test('canonical v1 create reverse review is rejected because task-level reverse review is deprecated', async ({
    assert,
    client,
  }) => {
    const { reviewee, owner, session } = await buildReviewSessionScenario()

    const response = await client
      .post(`/api/v1/review-sessions/${session.id}/reverse-reviews`)
      .loginAs(reviewee)
      .json({
        targetType: 'manager',
        targetId: owner.id,
        rating: 4,
        comment: 'Clear direction v1',
        isAnonymous: false,
      })

    response.assertStatus(400)
    assert.include(JSON.stringify(response.body()), 'Review theo task đã tắt')
  })
})
