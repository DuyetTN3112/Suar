import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'
import { DateTime } from 'luxon'

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

async function buildReviewDisputeOpenScenario() {
  const superadmin = await UserFactory.createSuperadmin()
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
    title: 'Review data API standardization task',
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
    completed_at: DateTime.now(),
  })

  return { superadmin, owner, reviewee, project, task, assignment, session }
}

async function countAuditEvents(action: string, entityType: string, entityId: string): Promise<number> {
  const result = (await db.from('audit_events')
    .where('action', action)
    .where('entity_type', entityType)
    .where('entity_id', entityId)
    .count('* as count')) as { count: number | string }[]

  return Number(result[0]?.count ?? 0)
}

async function buildAdminDisputeDetailScenario() {
  const scenario = await buildReviewDisputeOpenScenario()
  const disputeId = testId()
  const caseFileId = testId()
  const evaluationId = testId()

  await db.table('review_disputes').insert({
    id: disputeId,
    review_session_id: scenario.session.id,
    task_assignment_id: scenario.assignment.id,
    task_id: scenario.task.id,
    reviewee_id: scenario.reviewee.id,
    opened_by: scenario.reviewee.id,
    status: 'pending',
    dispute_reason: 'Need admin detail view',
    disputed_dimensions: JSON.stringify({ code_quality: true }),
    disputed_skill_reviews: JSON.stringify([{ skill_id: 'skill-1' }]),
    requested_outcome: 'adjust_score',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  })

  await db.table('review_dispute_comments').insert({
    id: testId(),
    dispute_id: disputeId,
    author_id: scenario.owner.id,
    body: 'Initial comment',
    visibility: 'all_parties',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  })

  await db.table('review_dispute_evidences').insert({
    id: testId(),
    dispute_id: disputeId,
    uploaded_by: scenario.owner.id,
    evidence_type: 'document_link',
    url: 'https://example.com/evidence',
    title: 'Evidence doc',
    description: 'Supporting material',
    created_at: '2026-01-01T00:00:00.000Z',
  })

  await db.table('review_dispute_case_files').insert({
    id: caseFileId,
    dispute_id: disputeId,
    case_version: 1,
    created_by: scenario.superadmin.id,
    task_snapshot: JSON.stringify({ task_id: scenario.task.id }),
    required_skills_snapshot: JSON.stringify([{ skill_id: 'skill-1' }]),
    acceptance_criteria_snapshot: JSON.stringify({ verification_method: 'demo' }),
    assignment_snapshot: JSON.stringify({ assignee_id: scenario.reviewee.id }),
    submission_snapshot: JSON.stringify({}),
    review_snapshot: JSON.stringify({ review_session_id: scenario.session.id }),
    skill_reviews_snapshot: JSON.stringify([]),
    evidences_snapshot: JSON.stringify([]),
    self_assessment_snapshot: JSON.stringify({}),
    task_comments_snapshot: JSON.stringify([]),
    task_history_snapshot: JSON.stringify([]),
    reviewee_profile_context_snapshot: JSON.stringify({ reviewee_id: scenario.reviewee.id }),
    reviewer_context_snapshot: JSON.stringify({ system_role: 'system_admin' }),
    dispute_claim_snapshot: JSON.stringify({ requested_outcome: 'adjust_score' }),
    completeness_score: 90,
    missing_data: JSON.stringify([]),
    created_at: '2026-01-01T00:00:00.000Z',
  })

  await db.table('ai_dispute_evaluations').insert({
    id: evaluationId,
    dispute_id: disputeId,
    case_file_id: caseFileId,
    provider: 'ai_council',
    external_run_id: 'run-1',
    status: 'queued',
    request_payload: JSON.stringify({
      case_id: disputeId,
      reviewer_context: { system_role: 'system_admin' },
    }),
    created_at: '2026-01-01T00:00:00.000Z',
  })

  return { ...scenario, disputeId }
}

test.group('Integration | Review data API standardization', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('create review dispute accepts camelCase body and returns wrapped camelCase data', async ({
    assert,
    client,
  }) => {
    const { reviewee, session } = await buildReviewDisputeOpenScenario()

    const response = await client
      .post('/api/reviews/disputes')
      .loginAs(reviewee)
      .json({
        reviewSessionId: session.id,
        disputeReason: 'Need a second opinion',
        disputedDimensions: { codeQuality: true },
        disputedSkillReviews: [],
        requestedOutcome: 'adjust_score',
      })

    response.assertStatus(201)

    const body = response.body() as {
      data: {
        id: string
        reviewSessionId: string
        taskAssignmentId: string
        taskId: string
        revieweeId: string
        openedBy: string
        disputeReason: string
        requestedOutcome: string
      }
    }

    assert.notProperty(body, 'success')
    assert.equal(body.data.reviewSessionId, session.id)
    assert.equal(body.data.revieweeId, reviewee.id)
    assert.equal(body.data.openedBy, reviewee.id)
    assert.equal(body.data.disputeReason, 'Need a second opinion')
    assert.equal(body.data.requestedOutcome, 'adjust_score')
    assert.equal(await countAuditEvents('review.dispute.created', 'review_dispute', body.data.id), 1)
  })

  test('canonical v1 create review dispute preserves legacy wrapped camelCase contract', async ({
    assert,
    client,
  }) => {
    const { reviewee, session } = await buildReviewDisputeOpenScenario()

    const response = await client
      .post('/api/v1/reviews/disputes')
      .loginAs(reviewee)
      .json({
        reviewSessionId: session.id,
        disputeReason: 'Need a second opinion v1',
        disputedDimensions: { codeQuality: true },
        disputedSkillReviews: [],
        requestedOutcome: 'adjust_score',
      })

    response.assertStatus(201)

    const body = response.body() as {
      data: {
        reviewSessionId: string
        revieweeId: string
        openedBy: string
        disputeReason: string
        requestedOutcome: string
      }
    }

    assert.notProperty(body, 'success')
    assert.equal(body.data.reviewSessionId, session.id)
    assert.equal(body.data.revieweeId, reviewee.id)
    assert.equal(body.data.openedBy, reviewee.id)
    assert.equal(body.data.disputeReason, 'Need a second opinion v1')
    assert.equal(body.data.requestedOutcome, 'adjust_score')
  })

  test('build dispute case-file returns wrapped camelCase payload without success envelope', async ({
    assert,
    client,
  }) => {
    const { superadmin, owner, reviewee, task, assignment, session } =
      await buildReviewDisputeOpenScenario()
    const disputeId = testId()

    await db.table('review_disputes').insert({
      id: disputeId,
      review_session_id: session.id,
      task_assignment_id: assignment.id,
      task_id: task.id,
      reviewee_id: reviewee.id,
      opened_by: owner.id,
      status: 'pending',
      dispute_reason: 'Need evidence bundle',
      disputed_dimensions: JSON.stringify({ quality: true }),
      disputed_skill_reviews: JSON.stringify([]),
      requested_outcome: 'adjust_score',
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    })

    const response = await client
      .post(`/api/admin/reviews/disputes/${disputeId}/case-files`)
      .loginAs(superadmin)

    response.assertStatus(201)

    const body = response.body() as {
      data: {
        disputeId: string
        caseVersion: number
        taskSnapshot: { id: string }
        assignmentSnapshot: { id: string }
        reviewSnapshot: { id: string }
      }
    }

    assert.notProperty(body, 'success')
    assert.equal(body.data.disputeId, disputeId)
    assert.equal(body.data.caseVersion, 1)
    assert.equal(body.data.taskSnapshot.id, task.id)
    assert.equal(body.data.assignmentSnapshot.id, assignment.id)
    assert.equal(body.data.reviewSnapshot.id, session.id)
  })

  test('admin dispute detail returns wrapped camelCase nested payload without success envelope', async ({
    assert,
    client,
  }) => {
    const { superadmin, disputeId, session } = await buildAdminDisputeDetailScenario()

    const response = await client
      .get(`/api/admin/reviews/disputes/${disputeId}`)
      .loginAs(superadmin)

    response.assertStatus(200)

    const body = response.body() as {
      data: {
        dispute: {
          reviewSessionId: string
          disputeReason: string
          requestedOutcome: string
          disputedDimensions: { codeQuality: boolean }
        }
        comments: Array<{ authorId: string; authorContext: string | null }>
        evidences: Array<{ evidenceType: string; uploadedBy: string }>
        caseFiles: Array<{
          caseVersion: number
          taskCommentsSnapshot: Array<{ body: string; commentType: string }>
          evidencesSnapshot: Array<{ evidenceType: string; title: string }>
          missingData: string[]
          reviewerContextSnapshot: { systemRole: string }
        }>
        aiEvaluations: Array<{ requestPayload: { caseId: string; reviewerContext: { systemRole: string } } }>
        timeline: Array<{ occurredAt: string; actorId: string | null }>
      }
    }

    assert.notProperty(body, 'success')
    assert.equal(body.data.dispute.reviewSessionId, session.id)
    assert.equal(body.data.dispute.disputeReason, 'Need admin detail view')
    assert.equal(body.data.dispute.requestedOutcome, 'adjust_score')
    assert.isTrue(body.data.dispute.disputedDimensions.codeQuality)
    assert.property(body.data.comments[0] ?? {}, 'authorId')
    assert.property(body.data.comments[0] ?? {}, 'authorContext')
    assert.equal(body.data.evidences[0]?.evidenceType, 'document_link')
    assert.property(body.data.evidences[0] ?? {}, 'uploadedBy')
    assert.equal(body.data.caseFiles[0]?.caseVersion, 1)
    assert.equal(body.data.caseFiles[0]?.taskCommentsSnapshot.length, 0)
    assert.equal(body.data.caseFiles[0]?.evidencesSnapshot.length, 0)
    assert.deepEqual(body.data.caseFiles[0]?.missingData, [])
    assert.equal(body.data.caseFiles[0]?.reviewerContextSnapshot.systemRole, 'system_admin')
    assert.equal(body.data.aiEvaluations[0]?.requestPayload.caseId, disputeId)
    assert.equal(
      body.data.aiEvaluations[0]?.requestPayload.reviewerContext.systemRole,
      'system_admin'
    )
    assert.property(body.data.timeline[0] ?? {}, 'occurredAt')
    assert.property(body.data.timeline[0] ?? {}, 'actorId')
  })
})
