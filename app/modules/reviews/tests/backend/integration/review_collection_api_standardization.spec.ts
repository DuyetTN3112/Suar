import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'
import { DateTime } from 'luxon'

import ProjectSprint from '#modules/reviews/infra/models/project_sprint'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  cleanupTestData,
  OrganizationFactory,
  ProjectFactory,
  ReverseReviewFactory,
  ReviewSessionFactory,
  TaskAssignmentFactory,
  TaskFactory,
  UserFactory,
} from '#tests/helpers/factories'
import { testId } from '#tests/helpers/test_utils'

async function buildReverseReviewScenario() {
  const { org, owner } = await OrganizationFactory.createWithOwner()
  const reviewee = await UserFactory.create({ current_organization_id: org.id })
  const project = await ProjectFactory.create({
    organization_id: org.id,
    creator_id: owner.id,
    owner_id: owner.id,
  })
  const task = await TaskFactory.create({
    organization_id: org.id,
    creator_id: owner.id,
    project_id: project.id,
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

  await ReverseReviewFactory.create({
    review_session_id: session.id,
    reviewer_id: reviewee.id,
    target_type: 'manager',
    target_id: owner.id,
    rating: 4,
    comment: 'Strong communication',
    is_anonymous: false,
  })

  return { reviewee, session, owner }
}

async function buildAdminDisputeScenario() {
  const superadmin = await UserFactory.createSuperadmin()
  const { org, owner } = await OrganizationFactory.createWithOwner()
  const reviewee = await UserFactory.create({ current_organization_id: org.id })
  const task = await TaskFactory.create({
    organization_id: org.id,
    creator_id: owner.id,
    assigned_to: reviewee.id,
    title: 'Collection standardization dispute task',
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
    status: 'disputed',
  })
  const disputeId = testId()

  await db.table('review_disputes').insert({
    id: disputeId,
    review_session_id: session.id,
    task_assignment_id: assignment.id,
    task_id: task.id,
    reviewee_id: reviewee.id,
    opened_by: owner.id,
    status: 'pending',
    dispute_reason: 'Need admin review',
    disputed_dimensions: JSON.stringify(['quality']),
    disputed_skill_reviews: JSON.stringify([]),
    requested_outcome: 'adjust_score',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  })

  return { superadmin, disputeId }
}

async function buildAdminSprintDisputeScenario() {
  const superadmin = await UserFactory.createSuperadmin()
  const { org, owner } = await OrganizationFactory.createWithOwner()
  const reviewer = await UserFactory.create({ current_organization_id: org.id })
  const project = await ProjectFactory.create({
    organization_id: org.id,
    creator_id: owner.id,
    owner_id: owner.id,
  })
  const sprint = await ProjectSprint.create({
    id: testId(),
    organization_id: org.id,
    project_id: project.id,
    name: 'Admin Sprint Dispute Sprint',
    status: 'review_open',
    starts_at: DateTime.fromISO('2026-07-01T00:00:00.000Z'),
    ends_at: DateTime.fromISO('2026-07-14T00:00:00.000Z'),
    created_by: owner.id,
    closed_by: owner.id,
    review_opened_at: DateTime.fromISO('2026-07-14T01:00:00.000Z'),
    review_closed_at: null,
  })
  const task = await TaskFactory.create({
    organization_id: org.id,
    project_id: project.id,
    project_sprint_id: sprint.id,
    creator_id: owner.id,
    assigned_to: reviewer.id,
    title: 'Admin sprint context task',
    status: 'done',
  })
  const packageId = testId()
  const disputeId = testId()

  await db.table('sprint_review_packages').insert({
    id: packageId,
    sprint_id: sprint.id,
    reviewer_id: reviewer.id,
    status: 'submitted',
    submitted_at: '2026-07-14T02:00:00.000Z',
    created_at: '2026-07-14T01:00:00.000Z',
    updated_at: '2026-07-14T02:00:00.000Z',
  })
  await db.table('sprint_review_disputes').insert({
    id: disputeId,
    package_id: packageId,
    opened_by: reviewer.id,
    status: 'admin_reviewing',
    dispute_reason: 'Manager context missed related sprint task.',
    dispute_review_type: 'manager_review',
    requested_outcome: 'add_context',
    escalation_reason: 'Admin needs org/project/sprint context.',
    reported_to_admin_at: '2026-07-14T03:00:00.000Z',
    reported_to_admin_by: reviewer.id,
    runtime_context: JSON.stringify({
      schema_version: 'suar_sprint_review_dispute_runtime_context_v1',
      dispute_review_type: 'manager_review',
      organization: { id: org.id, name: org.name },
      project: { id: project.id, name: project.name },
      sprint: { id: sprint.id, name: sprint.name },
      sprint_peer_tasks: [{ id: task.id, project_sprint_id: sprint.id, title: task.title }],
      manager_reviews: [{ target_user_id: owner.id, rating: 2 }],
      environment_reviews: [],
    }),
    created_at: '2026-07-14T02:30:00.000Z',
    updated_at: '2026-07-14T03:00:00.000Z',
  })
  await db.table('sprint_review_dispute_comments').insert({
    id: testId(),
    dispute_id: disputeId,
    author_id: reviewer.id,
    body: 'Need related sprint context.',
    visibility: 'all_parties',
    created_at: '2026-07-14T02:45:00.000Z',
    updated_at: '2026-07-14T02:45:00.000Z',
  })

  return { superadmin, disputeId, org, project, sprint, task }
}

async function buildAdminSprintReverseWorkflowScenario() {
  const superadmin = await UserFactory.createSuperadmin()
  const { org, owner } = await OrganizationFactory.createWithOwner()
  const reviewer = await UserFactory.create({ current_organization_id: org.id })
  const project = await ProjectFactory.create({
    organization_id: org.id,
    creator_id: owner.id,
    owner_id: owner.id,
  })
  const sprint = await ProjectSprint.create({
    id: testId(),
    organization_id: org.id,
    project_id: project.id,
    name: 'Admin Reverse Workflow Sprint',
    status: 'review_open',
    starts_at: DateTime.fromISO('2026-07-01T00:00:00.000Z'),
    ends_at: DateTime.fromISO('2026-07-14T00:00:00.000Z'),
    created_by: owner.id,
    closed_by: owner.id,
    review_opened_at: DateTime.fromISO('2026-07-14T01:00:00.000Z'),
    review_closed_at: null,
  })
  const task = await TaskFactory.create({
    organization_id: org.id,
    project_id: project.id,
    project_sprint_id: sprint.id,
    creator_id: owner.id,
    assigned_to: reviewer.id,
    title: 'Environment context task',
    status: 'done',
  })
  const workflowId = testId()

  await db.table('sprint_reverse_review_workflows').insert({
    id: workflowId,
    sprint_id: sprint.id,
    project_id: project.id,
    organization_id: org.id,
    reviewer_id: reviewer.id,
    target_type: 'environment',
    target_user_id: null,
    target_entity_id: org.id,
    responder_id: owner.id,
    status: 'reported',
    rating: 2,
    comment: 'Environment lacked handoff clarity.',
    package_id: null,
    submitted_at: '2026-07-14T02:00:00.000Z',
    accepted_at: null,
    reported_at: '2026-07-14T03:00:00.000Z',
    created_at: '2026-07-14T01:30:00.000Z',
    updated_at: '2026-07-14T03:00:00.000Z',
  })
  await db.table('sprint_reverse_review_messages').insert({
    id: testId(),
    workflow_id: workflowId,
    author_id: owner.id,
    message_type: 'report',
    body: 'Escalate unresolved environment review.',
    metadata: JSON.stringify({
      runtime_context: {
        schema_version: 'suar_sprint_reverse_review_report_context_v1',
        dispute_review_type: 'environment_review',
        organization: { id: org.id, name: org.name },
        project: { id: project.id, name: project.name },
        sprint: { id: sprint.id, name: sprint.name },
        sprint_peer_tasks: [{ id: task.id, project_sprint_id: sprint.id, title: task.title }],
      },
    }),
    created_at: '2026-07-14T03:00:00.000Z',
  })

  return { superadmin, workflowId, org, project, sprint, task }
}

async function buildAdminTaskReviewWorkflowScenario() {
  const superadmin = await UserFactory.createSuperadmin()
  const { org, owner } = await OrganizationFactory.createWithOwner()
  const reviewee = await UserFactory.create({ current_organization_id: org.id })
  const reviewer = await UserFactory.create({ current_organization_id: org.id })
  const project = await ProjectFactory.create({
    organization_id: org.id,
    creator_id: owner.id,
    owner_id: owner.id,
  })
  const sprint = await ProjectSprint.create({
    id: testId(),
    organization_id: org.id,
    project_id: project.id,
    name: 'Admin Task Review Workflow Sprint',
    status: 'active',
    starts_at: DateTime.fromISO('2026-07-01T00:00:00.000Z'),
    ends_at: DateTime.fromISO('2026-07-14T00:00:00.000Z'),
    created_by: owner.id,
    closed_by: null,
    review_opened_at: null,
    review_closed_at: null,
  })
  const task = await TaskFactory.create({
    organization_id: org.id,
    project_id: project.id,
    project_sprint_id: sprint.id,
    creator_id: owner.id,
    assigned_to: reviewee.id,
    title: 'Admin task review workflow context task',
    status: 'done',
  })
  const workflowId = testId()
  const runtimeContext = {
    schema_version: 'suar_task_review_workflow_runtime_context_v1',
    source_type: 'task_review_workflow',
    dispute_review_type: 'task_review',
    organization: { id: org.id, name: org.name },
    project: { id: project.id, name: project.name },
    sprint: { id: sprint.id, name: sprint.name },
    task: { id: task.id, title: task.title, project_sprint_id: sprint.id },
    task_giver_context: { user_id: owner.id, profile: { summary: { role: 'task_giver' } } },
    reviewee_context: { user_id: reviewee.id, profile: { summary: { role: 'reviewee' } } },
    reporter_context: { user_id: reviewer.id },
    related_project_tasks: [{ id: task.id, project_id: project.id, title: task.title }],
    sprint_peer_tasks: [{ id: task.id, project_sprint_id: sprint.id, title: task.title }],
  }

  await db.table('task_review_workflows').insert({
    id: workflowId,
    task_id: task.id,
    project_id: project.id,
    organization_id: org.id,
    reviewee_id: reviewee.id,
    status: 'reported',
    required_review_count: 2,
    completed_review_count: 2,
    accepted_by_reviewee_at: null,
    reported_at: '2026-07-14T03:00:00.000Z',
    reported_by: reviewer.id,
    runtime_context: JSON.stringify(runtimeContext),
    completed_at: null,
    created_at: '2026-07-14T01:30:00.000Z',
    updated_at: '2026-07-14T03:00:00.000Z',
  })
  await db.table('task_review_messages').insert({
    id: testId(),
    workflow_id: workflowId,
    author_id: reviewer.id,
    message_type: 'system',
    body: 'Task review dispute reported: Admin needs task workflow context.',
    metadata: JSON.stringify({ runtime_context: runtimeContext }),
    created_at: '2026-07-14T03:00:00.000Z',
  })

  return { superadmin, workflowId, org, project, sprint, task }
}

async function insertAiEvaluationForSource(input: {
  sourceId: string
  sourceType: string
  recommendation: string
}) {
  await db.table('ai_dispute_evaluations').insert({
    id: testId(),
    dispute_id: input.sourceId,
    case_file_id: null,
    source_type: input.sourceType,
    source_id: input.sourceId,
    provider: 'clawagent',
    external_run_id: `${input.sourceType}-run-1`,
    status: 'completed',
    recommendation: input.recommendation,
    confidence_score: 0.82,
    summary: 'AI result ready for admin review.',
    request_payload: JSON.stringify({
      case_id: input.sourceId,
      source_type: input.sourceType,
    }),
    response_payload: JSON.stringify({
      verdict: {
        recommendation: input.recommendation,
      },
    }),
    created_at: '2026-07-14T03:05:00.000Z',
    completed_at: '2026-07-14T03:10:00.000Z',
  })
}

test.group('Integration | Review collection API standardization', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('me reverse reviews API returns wrapped camelCase list without success envelope', async ({
    assert,
    client,
  }) => {
    const { reviewee, session, owner } = await buildReverseReviewScenario()
    await reviewee.refresh()

    const response = await client.get('/api/me/reverse-reviews').loginAs(reviewee)
    response.assertStatus(200)

    const body = response.body() as {
      data: Array<{
        reviewSessionId: string
        reviewerId: string
        targetType: string
        targetId: string
        isAnonymous: boolean
        createdAt: string
      }>
      pagination: {
        page: number
        perPage: number
        total: number
        lastPage: number
        hasNextPage: boolean
        nextCursor: string | null
        previousCursor: string | null
        hasPreviousPage: boolean
      }
    }

    assert.notProperty(body, 'success')
    assert.equal(body.data[0]?.reviewSessionId, session.id)
    assert.equal(body.data[0]?.reviewerId, reviewee.id)
    assert.equal(body.data[0]?.targetType, 'manager')
    assert.equal(body.data[0]?.targetId, owner.id)
    assert.isFalse(body.data[0]?.isAnonymous ?? true)
    assert.property(body.data[0] ?? {}, 'createdAt')
    assert.deepInclude(body.pagination, {
      page: 1,
      perPage: 20,
      total: 1,
      lastPage: 1,
      hasNextPage: false,
      nextCursor: null,
      previousCursor: null,
      hasPreviousPage: false,
    })
  })

  test('canonical v1 me reverse reviews API preserves legacy wrapped camelCase contract', async ({
    assert,
    client,
  }) => {
    const { reviewee } = await buildReverseReviewScenario()
    await reviewee.refresh()

    const legacyResponse = await client.get('/api/me/reverse-reviews').loginAs(reviewee)
    legacyResponse.assertStatus(200)

    const canonicalResponse = await client.get('/api/v1/me/reverse-reviews').loginAs(reviewee)
    canonicalResponse.assertStatus(200)

    assert.deepEqual(canonicalResponse.body(), legacyResponse.body())
  })

  test('admin dispute case-files API returns wrapped camelCase list without success envelope', async ({
    assert,
    client,
  }) => {
    const { superadmin, disputeId } = await buildAdminDisputeScenario()
    await superadmin.refresh()
    const caseFileId = testId()

    await db.table('review_dispute_case_files').insert({
      id: caseFileId,
      dispute_id: disputeId,
      case_version: 1,
      created_by: superadmin.id,
      task_snapshot: JSON.stringify({ task_id: 'task-1', created_at: '2026-01-01T00:00:00.000Z' }),
      required_skills_snapshot: JSON.stringify([
        { skill_id: 'skill-1', verified_public_proficiency_code: 'senior' },
      ]),
      acceptance_criteria_snapshot: JSON.stringify({ verification_method: 'demo' }),
      assignment_snapshot: JSON.stringify({ assignee_id: 'user-1' }),
      submission_snapshot: JSON.stringify({ submission_status: 'submitted' }),
      review_snapshot: JSON.stringify({ review_session_id: 'session-1' }),
      skill_reviews_snapshot: JSON.stringify([{ assigned_public_proficiency_code: 'senior' }]),
      evidences_snapshot: JSON.stringify([{ evidence_type: 'document_link' }]),
      self_assessment_snapshot: JSON.stringify({ overall_satisfaction: 5 }),
      task_comments_snapshot: JSON.stringify([{ author_id: 'user-1' }]),
      task_history_snapshot: JSON.stringify([{ changed_at: '2026-01-01T00:00:00.000Z' }]),
      reviewee_profile_context_snapshot: JSON.stringify({ reviewee_id: 'user-1' }),
      reviewer_context_snapshot: JSON.stringify({ system_role: 'system_admin' }),
      dispute_claim_snapshot: JSON.stringify({ requested_outcome: 'adjust_score' }),
      completeness_score: 92,
      missing_data: JSON.stringify([{ key: 'none' }]),
      created_at: '2026-01-01T00:00:00.000Z',
    })

    const response = await client
      .get(`/api/admin/reviews/disputes/${disputeId}/case-files`)
      .loginAs(superadmin)

    response.assertStatus(200)

    const body = response.body() as {
      data: Array<{
        disputeId: string
        caseVersion: number
        createdBy: string
        taskSnapshot: { taskId: string; createdAt: string }
        requiredSkillsSnapshot: Array<{ skillId: string; levelCode: string }>
        taskCommentsSnapshot: Array<{ authorId: string }>
        evidencesSnapshot: Array<{ evidenceType: string }>
        missingData: string[]
        reviewerContextSnapshot: { systemRole: string }
        disputeClaimSnapshot: { requestedOutcome: string }
      }>
    }

    assert.notProperty(body, 'success')
    assert.equal(body.data[0]?.disputeId, disputeId)
    assert.equal(body.data[0]?.caseVersion, 1)
    assert.equal(body.data[0]?.createdBy, superadmin.id)
    assert.equal(body.data[0]?.taskSnapshot.taskId, 'task-1')
    assert.equal(body.data[0]?.taskSnapshot.createdAt, '2026-01-01T00:00:00.000Z')
    assert.equal(body.data[0]?.requiredSkillsSnapshot[0]?.skillId, 'skill-1')
    assert.equal(body.data[0]?.requiredSkillsSnapshot[0]?.levelCode, 'l10')
    assert.equal(body.data[0]?.taskCommentsSnapshot[0]?.authorId, 'user-1')
    assert.equal(body.data[0]?.evidencesSnapshot[0]?.evidenceType, 'document_link')
    assert.deepEqual(body.data[0]?.missingData, ['none'])
    assert.equal(body.data[0]?.reviewerContextSnapshot.systemRole, 'system_admin')
    assert.equal(body.data[0]?.disputeClaimSnapshot.requestedOutcome, 'adjust_score')
  })

  test('admin dispute ai-evaluations API returns wrapped camelCase list without success envelope', async ({
    assert,
    client,
  }) => {
    const { superadmin, disputeId } = await buildAdminDisputeScenario()
    await superadmin.refresh()
    const caseFileId = testId()

    await db.table('review_dispute_case_files').insert({
      id: caseFileId,
      dispute_id: disputeId,
      case_version: 1,
      created_by: superadmin.id,
      task_snapshot: JSON.stringify({ task_id: 'task-1' }),
      required_skills_snapshot: JSON.stringify([]),
      acceptance_criteria_snapshot: JSON.stringify({}),
      assignment_snapshot: JSON.stringify({}),
      submission_snapshot: JSON.stringify({}),
      review_snapshot: JSON.stringify({}),
      skill_reviews_snapshot: JSON.stringify([]),
      evidences_snapshot: JSON.stringify([]),
      self_assessment_snapshot: JSON.stringify({}),
      task_comments_snapshot: JSON.stringify([]),
      task_history_snapshot: JSON.stringify([]),
      reviewee_profile_context_snapshot: JSON.stringify({}),
      reviewer_context_snapshot: JSON.stringify({}),
      dispute_claim_snapshot: JSON.stringify({}),
      completeness_score: 100,
      missing_data: JSON.stringify([]),
      created_at: '2026-01-01T00:00:00.000Z',
    })

    await db.table('ai_dispute_evaluations').insert({
      id: testId(),
      dispute_id: disputeId,
      case_file_id: caseFileId,
      provider: 'ai_council',
      external_run_id: 'run-1',
      status: 'completed',
      recommendation: 'adjust_score',
      confidence_score: 0.9,
      summary: '70% Respondent, 30% Claimant',
      request_payload: JSON.stringify({
        case_id: disputeId,
        case_file_id: caseFileId,
        reviewer_context: { system_role: 'system_admin' },
      }),
      response_payload: JSON.stringify({
        verdict: {
          recommendation: 'adjust_score',
          verdict: '70% Respondent, 30% Claimant',
          rationale: 'Mock rationale based on review evidence.',
          evidence_summary:
            'Review evidence and acceptance criteria support a partial score adjustment.',
          score_or_review_delta: 'Partial score adjustment',
          action_items: ['Notify both parties'],
          unknowns_or_missing_evidence: 'none',
          confidence: 0.9,
        },
      }),
      created_at: '2026-01-01T00:00:00.000Z',
      completed_at: '2026-01-01T00:05:00.000Z',
    })

    const response = await client
      .get(`/api/admin/reviews/disputes/${disputeId}/ai-evaluations`)
      .loginAs(superadmin)

    response.assertStatus(200)

    const body = response.body() as {
      data: Array<{
        disputeId: string
        caseFileId: string
        externalRunId: string
        recommendation: string
        confidenceScore: number | string
        summary: string
        requestPayload: {
          caseId: string
          caseFileId: string
          reviewerContext: { systemRole: string }
        }
        responsePayload: {
          verdict: {
            recommendation: string
            evidenceSummary: string
            scoreOrReviewDelta: string
            actionItems: string[]
            unknownsOrMissingEvidence: string
            confidence: number
          }
        }
      }>
    }

    assert.notProperty(body, 'success')
    assert.equal(body.data[0]?.disputeId, disputeId)
    assert.equal(body.data[0]?.caseFileId, caseFileId)
    assert.equal(body.data[0]?.externalRunId, 'run-1')
    assert.equal(body.data[0]?.recommendation, 'adjust_score')
    assert.equal(Number(body.data[0]?.confidenceScore), 0.9)
    assert.equal(body.data[0]?.summary, '70% Respondent, 30% Claimant')
    assert.equal(body.data[0]?.requestPayload.caseId, disputeId)
    assert.equal(body.data[0]?.requestPayload.caseFileId, caseFileId)
    assert.equal(body.data[0]?.requestPayload.reviewerContext.systemRole, 'system_admin')
    assert.equal(body.data[0]?.responsePayload.verdict.recommendation, 'adjust_score')
    assert.equal(
      body.data[0]?.responsePayload.verdict.evidenceSummary,
      'Review evidence and acceptance criteria support a partial score adjustment.'
    )
    assert.equal(
      body.data[0]?.responsePayload.verdict.scoreOrReviewDelta,
      'Partial score adjustment'
    )
    assert.deepEqual(body.data[0]?.responsePayload.verdict.actionItems, ['Notify both parties'])
    assert.equal(body.data[0]?.responsePayload.verdict.unknownsOrMissingEvidence, 'none')
    assert.equal(body.data[0]?.responsePayload.verdict.confidence, 0.9)
  })

  test('admin disputes API surfaces sprint review disputes with runtime hierarchy context', async ({
    assert,
    client,
  }) => {
    const { superadmin, disputeId, org, project, sprint, task } =
      await buildAdminSprintDisputeScenario()
    await insertAiEvaluationForSource({
      sourceId: disputeId,
      sourceType: 'sprint_review_dispute',
      recommendation: 'partially_accept',
    })
    await superadmin.refresh()

    const listResponse = await client.get('/api/admin/reviews/disputes').loginAs(superadmin)
    listResponse.assertStatus(200)
    const listBody = listResponse.body() as {
      data: Array<{
        id: string
        sourceType: string
        disputeReviewType: string
        organizationId: string
        projectId: string
        sprintId: string
        commentsCount: number
        aiEvaluationsCount: number
      }>
    }
    const listItem = listBody.data.find((item) => item.id === disputeId)
    assert.exists(listItem)
    assert.equal(listItem?.sourceType, 'sprint_review_dispute')
    assert.equal(listItem?.disputeReviewType, 'manager_review')
    assert.equal(listItem?.organizationId, org.id)
    assert.equal(listItem?.projectId, project.id)
    assert.equal(listItem?.sprintId, sprint.id)
    assert.equal(listItem?.commentsCount, 1)
    assert.equal(listItem?.aiEvaluationsCount, 1)

    const detailResponse = await client
      .get(`/api/admin/reviews/disputes/${disputeId}`)
      .loginAs(superadmin)
    detailResponse.assertStatus(200)
    const detailBody = detailResponse.body() as {
      data: {
        dispute: {
          id: string
          sourceType: string
          disputeReviewType: string
          organizationId: string
          projectId: string
          sprintId: string
          runtimeContext: {
            disputeReviewType: string
            organization: { id: string }
            project: { id: string }
            sprint: { id: string }
            sprintPeerTasks: Array<{ id: string }>
          }
        }
        comments: Array<{ body: string }>
        aiEvaluations: Array<{ status: string; recommendation: string }>
      }
    }
    assert.equal(detailBody.data.dispute.id, disputeId)
    assert.equal(detailBody.data.dispute.sourceType, 'sprint_review_dispute')
    assert.equal(detailBody.data.dispute.disputeReviewType, 'manager_review')
    assert.equal(detailBody.data.dispute.organizationId, org.id)
    assert.equal(detailBody.data.dispute.projectId, project.id)
    assert.equal(detailBody.data.dispute.sprintId, sprint.id)
    assert.equal(detailBody.data.dispute.runtimeContext.disputeReviewType, 'manager_review')
    assert.equal(detailBody.data.dispute.runtimeContext.organization.id, org.id)
    assert.equal(detailBody.data.dispute.runtimeContext.project.id, project.id)
    assert.equal(detailBody.data.dispute.runtimeContext.sprint.id, sprint.id)
    assert.include(
      detailBody.data.dispute.runtimeContext.sprintPeerTasks.map((peerTask) => peerTask.id),
      task.id
    )
    assert.equal(detailBody.data.comments[0]?.body, 'Need related sprint context.')
    assert.equal(detailBody.data.aiEvaluations[0]?.status, 'completed')
    assert.equal(detailBody.data.aiEvaluations[0]?.recommendation, 'partially_accept')
  })

  test('admin can resolve sprint review dispute source without classic case file', async ({
    assert,
    client,
  }) => {
    const { superadmin, disputeId } = await buildAdminSprintDisputeScenario()
    await superadmin.refresh()

    const response = await client
      .post(`/api/admin/reviews/disputes/${disputeId}/resolve`)
      .loginAs(superadmin)
      .json({
        sourceType: 'sprint_review_dispute',
        finalDecision: 'partially_accept',
        finalRationale: 'Manager review missed related sprint task context.',
      })

    response.assertStatus(201)
    const body = response.body() as {
      data: {
        id: string
        sourceType: string
        status: string
        finalDecision: string
        finalRationale: string
      }
    }
    const dispute = (await db
      .from('sprint_review_disputes')
      .where('id', disputeId)
      .select('status', 'final_decision', 'final_rationale', 'resolved_at', 'resolved_by')
      .firstOrFail()) as Record<string, unknown>

    assert.equal(body.data.id, disputeId)
    assert.equal(body.data.sourceType, 'sprint_review_dispute')
    assert.equal(body.data.status, 'resolved')
    assert.equal(body.data.finalDecision, 'partially_accept')
    assert.equal(body.data.finalRationale, 'Manager review missed related sprint task context.')
    assert.equal(dispute['status'], 'resolved')
    assert.equal(dispute['final_decision'], 'partially_accept')
    assert.equal(dispute['final_rationale'], 'Manager review missed related sprint task context.')
    assert.exists(dispute['resolved_at'])
    assert.equal(dispute['resolved_by'], superadmin.id)
  })

  test('admin disputes API surfaces reported sprint reverse review workflows', async ({
    assert,
    client,
  }) => {
    const { superadmin, workflowId, org, project, sprint, task } =
      await buildAdminSprintReverseWorkflowScenario()
    await insertAiEvaluationForSource({
      sourceId: workflowId,
      sourceType: 'sprint_reverse_review_workflow',
      recommendation: 'dismiss_dispute',
    })
    await superadmin.refresh()

    const listResponse = await client.get('/api/admin/reviews/disputes').loginAs(superadmin)
    listResponse.assertStatus(200)
    const listBody = listResponse.body() as {
      data: Array<{
        id: string
        sourceType: string
        disputeReviewType: string
        organizationId: string
        projectId: string
        sprintId: string
        commentsCount: number
        aiEvaluationsCount: number
      }>
    }
    const listItem = listBody.data.find((item) => item.id === workflowId)
    assert.exists(listItem)
    assert.equal(listItem?.sourceType, 'sprint_reverse_review_workflow')
    assert.equal(listItem?.disputeReviewType, 'environment_review')
    assert.equal(listItem?.organizationId, org.id)
    assert.equal(listItem?.projectId, project.id)
    assert.equal(listItem?.sprintId, sprint.id)
    assert.equal(listItem?.commentsCount, 1)
    assert.equal(listItem?.aiEvaluationsCount, 1)

    const detailResponse = await client
      .get(`/api/admin/reviews/disputes/${workflowId}`)
      .loginAs(superadmin)
    detailResponse.assertStatus(200)
    const detailBody = detailResponse.body() as {
      data: {
        dispute: {
          id: string
          sourceType: string
          disputeReviewType: string
          runtimeContext: {
            disputeReviewType: string
            sprintPeerTasks: Array<{ id: string }>
          }
        }
        comments: Array<{ body: string }>
        aiEvaluations: Array<{ status: string; recommendation: string }>
      }
    }
    assert.equal(detailBody.data.dispute.id, workflowId)
    assert.equal(detailBody.data.dispute.sourceType, 'sprint_reverse_review_workflow')
    assert.equal(detailBody.data.dispute.disputeReviewType, 'environment_review')
    assert.equal(detailBody.data.dispute.runtimeContext.disputeReviewType, 'environment_review')
    assert.include(
      detailBody.data.dispute.runtimeContext.sprintPeerTasks.map((peerTask) => peerTask.id),
      task.id
    )
    assert.equal(detailBody.data.comments[0]?.body, 'Escalate unresolved environment review.')
    assert.equal(detailBody.data.aiEvaluations[0]?.status, 'completed')
    assert.equal(detailBody.data.aiEvaluations[0]?.recommendation, 'dismiss_dispute')
  })

  test('admin can resolve sprint reverse workflow source without classic case file', async ({
    assert,
    client,
  }) => {
    const { superadmin, workflowId } = await buildAdminSprintReverseWorkflowScenario()
    await superadmin.refresh()

    const response = await client
      .post(`/api/admin/reviews/disputes/${workflowId}/resolve`)
      .loginAs(superadmin)
      .json({
        sourceType: 'sprint_reverse_review_workflow',
        finalDecision: 'dismiss_dispute',
        finalRationale: 'Environment review report lacks enough support for admin change.',
      })

    response.assertStatus(201)
    const body = response.body() as {
      data: {
        id: string
        sourceType: string
        status: string
        finalDecision: string
        finalRationale: string
      }
    }
    const workflow = (await db
      .from('sprint_reverse_review_workflows')
      .where('id', workflowId)
      .select('status', 'final_decision', 'final_rationale', 'resolved_at', 'resolved_by')
      .firstOrFail()) as Record<string, unknown>

    assert.equal(body.data.id, workflowId)
    assert.equal(body.data.sourceType, 'sprint_reverse_review_workflow')
    assert.equal(body.data.status, 'resolved')
    assert.equal(body.data.finalDecision, 'dismiss_dispute')
    assert.equal(
      body.data.finalRationale,
      'Environment review report lacks enough support for admin change.'
    )
    assert.equal(workflow['status'], 'resolved')
    assert.equal(workflow['final_decision'], 'dismiss_dispute')
    assert.equal(
      workflow['final_rationale'],
      'Environment review report lacks enough support for admin change.'
    )
    assert.exists(workflow['resolved_at'])
    assert.equal(workflow['resolved_by'], superadmin.id)

    const detailResponse = await client
      .get(`/api/admin/reviews/disputes/${workflowId}`)
      .loginAs(superadmin)
    detailResponse.assertStatus(200)
    const detailBody = detailResponse.body() as {
      data: {
        dispute: {
          id: string
          sourceType: string
          status: string
          finalDecision: string
          finalRationale: string
          resolvedAt: string | null
        }
      }
    }
    assert.equal(detailBody.data.dispute.id, workflowId)
    assert.equal(detailBody.data.dispute.sourceType, 'sprint_reverse_review_workflow')
    assert.equal(detailBody.data.dispute.status, 'resolved')
    assert.equal(detailBody.data.dispute.finalDecision, 'dismiss_dispute')
    assert.equal(
      detailBody.data.dispute.finalRationale,
      'Environment review report lacks enough support for admin change.'
    )
    assert.exists(detailBody.data.dispute.resolvedAt)
  })

  test('admin disputes API surfaces reported task review workflows with runtime hierarchy context', async ({
    assert,
    client,
  }) => {
    const { superadmin, workflowId, org, project, sprint, task } =
      await buildAdminTaskReviewWorkflowScenario()
    await superadmin.refresh()

    const listResponse = await client.get('/api/admin/reviews/disputes').loginAs(superadmin)
    listResponse.assertStatus(200)
    const listBody = listResponse.body() as {
      data: Array<{
        id: string
        sourceType: string
        disputeReviewType: string
        organizationId: string
        projectId: string
        sprintId: string
        commentsCount: number
      }>
    }
    const listItem = listBody.data.find((item) => item.id === workflowId)
    assert.exists(listItem)
    assert.equal(listItem?.sourceType, 'task_review_workflow')
    assert.equal(listItem?.disputeReviewType, 'task_review')
    assert.equal(listItem?.organizationId, org.id)
    assert.equal(listItem?.projectId, project.id)
    assert.equal(listItem?.sprintId, sprint.id)
    assert.equal(listItem?.commentsCount, 1)

    const detailResponse = await client
      .get(`/api/admin/reviews/disputes/${workflowId}`)
      .loginAs(superadmin)
    detailResponse.assertStatus(200)
    const detailBody = detailResponse.body() as {
      data: {
        dispute: {
          id: string
          sourceType: string
          disputeReviewType: string
          organizationId: string
          projectId: string
          sprintId: string
          runtimeContext: {
            disputeReviewType: string
            organization: { id: string }
            project: { id: string }
            sprint: { id: string }
            sprintPeerTasks: Array<{ id: string }>
          }
        }
        comments: Array<{ body: string }>
      }
    }
    assert.equal(detailBody.data.dispute.id, workflowId)
    assert.equal(detailBody.data.dispute.sourceType, 'task_review_workflow')
    assert.equal(detailBody.data.dispute.disputeReviewType, 'task_review')
    assert.equal(detailBody.data.dispute.organizationId, org.id)
    assert.equal(detailBody.data.dispute.projectId, project.id)
    assert.equal(detailBody.data.dispute.sprintId, sprint.id)
    assert.equal(detailBody.data.dispute.runtimeContext.disputeReviewType, 'task_review')
    assert.equal(detailBody.data.dispute.runtimeContext.organization.id, org.id)
    assert.equal(detailBody.data.dispute.runtimeContext.project.id, project.id)
    assert.equal(detailBody.data.dispute.runtimeContext.sprint.id, sprint.id)
    assert.include(
      detailBody.data.dispute.runtimeContext.sprintPeerTasks.map((peerTask) => peerTask.id),
      task.id
    )
    assert.include(detailBody.data.comments[0]?.body, 'Task review dispute reported')
  })

  test('admin can resolve task review workflow source without classic case file', async ({
    assert,
    client,
  }) => {
    const { superadmin, workflowId } = await buildAdminTaskReviewWorkflowScenario()
    await superadmin.refresh()

    const response = await client
      .post(`/api/admin/reviews/disputes/${workflowId}/resolve`)
      .loginAs(superadmin)
      .json({
        sourceType: 'task_review_workflow',
        finalDecision: 'request_re_review',
        finalRationale: 'Task review workflow needs a fresh review with full context.',
      })

    response.assertStatus(201)
    const body = response.body() as {
      data: {
        id: string
        sourceType: string
        status: string
        finalDecision: string
        finalRationale: string
      }
    }
    const workflow = (await db
      .from('task_review_workflows')
      .where('id', workflowId)
      .select('status', 'final_decision', 'final_rationale', 'resolved_at', 'resolved_by')
      .firstOrFail()) as Record<string, unknown>

    assert.equal(body.data.id, workflowId)
    assert.equal(body.data.sourceType, 'task_review_workflow')
    assert.equal(body.data.status, 'resolved')
    assert.equal(body.data.finalDecision, 'request_re_review')
    assert.equal(body.data.finalRationale, 'Task review workflow needs a fresh review with full context.')
    assert.equal(workflow['status'], 'resolved')
    assert.equal(workflow['final_decision'], 'request_re_review')
    assert.equal(
      workflow['final_rationale'],
      'Task review workflow needs a fresh review with full context.'
    )
    assert.exists(workflow['resolved_at'])
    assert.equal(workflow['resolved_by'], superadmin.id)
  })
})
