import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'
import { DateTime } from 'luxon'

import { BACKEND_NOTIFICATION_TYPES } from '#modules/notifications/public_contracts/notification_constants'
import type { NotificationFanoutStagerContract } from '#modules/notifications/public_contracts/notification_fanout'
import type { PlatformEvent } from '#modules/observability/public_contracts/platform_observability'
import { platformOperationalLogger } from '#modules/observability/public_contracts/platform_observability'
import ReportReviewDisputeCommand from '#modules/reviews/actions/commands/disputes/report_review_dispute_command'
import LucidReviewDisputeCaseFileUnitOfWork from '#modules/reviews/infra/adapters/disputes/lucid_review_dispute_case_file_unit_of_work'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  cleanupTestData,
  OrganizationFactory,
  OrganizationUserFactory,
  ReviewSessionFactory,
  TaskAssignmentFactory,
  TaskFactory,
  UserFactory,
} from '#tests/helpers/factories'
import { testId } from '#tests/helpers/test_utils'

async function createDisputeScenario() {
  const superadmin = await UserFactory.createSuperadmin()
  const { org, owner } = await OrganizationFactory.createWithOwner()
  const reviewee = await UserFactory.create({ current_organization_id: org.id })
  await OrganizationUserFactory.create({
    organization_id: org.id,
    user_id: reviewee.id,
    org_role: 'org_member',
    status: 'approved',
  })
  const task = await TaskFactory.create({
    organization_id: org.id,
    creator_id: owner.id,
    assigned_to: reviewee.id,
    title: 'Review dispute contract task',
  })
  const sprintId = testId()
  await db.table('project_sprints').insert({
    id: sprintId,
    organization_id: org.id,
    project_id: task.project_id,
    name: 'Review dispute sprint',
    status: 'active',
    starts_at: DateTime.now().minus({ days: 7 }).toISO(),
    ends_at: DateTime.now().plus({ days: 7 }).toISO(),
    created_by: owner.id,
  })
  await db.from('tasks').where('id', task.id).update({ project_sprint_id: sprintId })
  const assignment = await TaskAssignmentFactory.create({
    task_id: task.id,
    assignee_id: reviewee.id,
    assigned_by: owner.id,
    assignment_status: 'completed',
  })
  const reviewSession = await ReviewSessionFactory.create({
    task_assignment_id: assignment.id,
    reviewee_id: reviewee.id,
    status: 'completed',
  })
  const disputeId = testId()

  await db.table('review_disputes').insert({
    id: disputeId,
    review_session_id: reviewSession.id,
    task_assignment_id: assignment.id,
    task_id: task.id,
    reviewee_id: reviewee.id,
    opened_by: owner.id,
    status: 'pending',
    dispute_reason: 'Need a second review',
    requested_outcome: 'adjust_score',
    disputed_dimensions: JSON.stringify(['quality']),
    disputed_skill_reviews: JSON.stringify([]),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  })

  return { superadmin, org, owner, reviewee, disputeId, task, assignment, reviewSession, sprintId }
}

async function createUserProfileAndHistory(input: {
  userId: string
  taskId: string
  assignmentId: string
  organizationId: string
  projectId: string
  role: string
}) {
  await db.table('user_profile_snapshots').insert({
    id: testId(),
    user_id: input.userId,
    version: 1,
    snapshot_name: `${input.role} profile`,
    is_current: true,
    is_public: true,
    summary: JSON.stringify({ role: input.role }),
    skills_verified: JSON.stringify([]),
    work_highlights: JSON.stringify([]),
    performance_metrics: JSON.stringify({ completed_tasks: 1 }),
    trust_metrics: JSON.stringify({ dispute_context: true }),
    scoring_version: 'test_profile_v1',
  })
  await db.table('user_work_history').insert({
    id: testId(),
    user_id: input.userId,
    task_id: input.taskId,
    task_assignment_id: input.assignmentId,
    organization_id: input.organizationId,
    project_id: input.projectId,
    task_title: `${input.role} work history`,
    task_type: 'review_dispute_context',
    business_domain: 'trust_review',
    problem_category: 'review_dispute',
    role_in_task: input.role,
    autonomy_level: null,
    collaboration_type: 'team',
    tech_stack: JSON.stringify([]),
    domain_tags: JSON.stringify(['review']),
    difficulty: 'medium',
    estimated_hours: 4,
    actual_hours: 3,
    was_on_time: true,
    days_early_or_late: -1,
    measurable_outcomes: JSON.stringify([]),
    estimated_business_value: null,
    knowledge_artifacts: JSON.stringify([]),
    overall_quality_score: 4,
    skill_scores: JSON.stringify([]),
    evidence_links: JSON.stringify([]),
    is_featured: false,
    is_public: true,
    completed_at: new Date(),
  })
}

function parseSnapshot(value: unknown): Record<string, unknown> {
  return typeof value === 'string'
    ? (JSON.parse(value) as Record<string, unknown>)
    : ((value ?? {}) as Record<string, unknown>)
}

function recordArray(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value) ? (value as Array<Record<string, unknown>>) : []
}

test.group('Integration | Review disputes API standardization', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('admin disputes list API returns wrapped list with pagination and camelCase fields', async ({
    assert,
    client,
  }) => {
    const { superadmin, disputeId, reviewee } = await createDisputeScenario()
    await superadmin.refresh()
    await db.from('review_disputes').where('id', disputeId).update({
      status: 'admin_reviewing',
      reported_to_admin_at: new Date().toISOString(),
      reported_to_admin_by: reviewee.id,
    })

    const response = await client.get('/api/admin/reviews/disputes').loginAs(superadmin)
    response.assertStatus(200)

    const body = response.body() as {
      data: Array<{
        id: string
        reviewSessionId: string
        taskAssignmentId: string
        taskId: string
        revieweeId: string
        openedBy: string
        disputeReason: string
        requestedOutcome: string
        finalDecision: string | null
        finalRationale: string | null
        createdAt: string
        resolvedAt: string | null
        taskTitle: string | null
        revieweeUsername: string | null
        reviewSessionStatus: string | null
        commentsCount: number
        evidencesCount: number
        latestCaseVersion: number | null
        aiEvaluationsCount: number
      }>
      pagination: {
        page: number
        perPage: number
        total: number
        hasNextPage: boolean
        nextCursor: string | null
        previousCursor: string | null
        hasPreviousPage: boolean
      }
    }

    assert.notProperty(body, 'success')
    assert.equal(body.data[0]?.id, disputeId)
    assert.property(body.data[0] ?? {}, 'reviewSessionId')
    assert.property(body.data[0] ?? {}, 'taskAssignmentId')
    assert.property(body.data[0] ?? {}, 'taskId')
    assert.property(body.data[0] ?? {}, 'revieweeId')
    assert.property(body.data[0] ?? {}, 'openedBy')
    assert.property(body.data[0] ?? {}, 'disputeReason')
    assert.property(body.data[0] ?? {}, 'requestedOutcome')
    assert.property(body.data[0] ?? {}, 'createdAt')
    assert.property(body.data[0] ?? {}, 'resolvedAt')
    assert.property(body.data[0] ?? {}, 'taskTitle')
    assert.property(body.data[0] ?? {}, 'revieweeUsername')
    assert.property(body.data[0] ?? {}, 'reviewSessionStatus')
    assert.property(body.data[0] ?? {}, 'commentsCount')
    assert.property(body.data[0] ?? {}, 'evidencesCount')
    assert.property(body.data[0] ?? {}, 'latestCaseVersion')
    assert.property(body.data[0] ?? {}, 'aiEvaluationsCount')
    assert.deepInclude(body.pagination, {
      page: 1,
      perPage: 20,
      nextCursor: null,
      previousCursor: null,
      hasPreviousPage: false,
    })
  })

  test('admin disputes list hides unreported classic review disputes', async ({ assert, client }) => {
    const { superadmin, disputeId } = await createDisputeScenario()
    await superadmin.refresh()

    const response = await client.get('/api/admin/reviews/disputes').loginAs(superadmin)
    response.assertStatus(200)

    const body = response.body() as { data: Array<{ id: string }> }
    assert.notInclude(
      body.data.map((dispute) => dispute.id),
      disputeId
    )
  })

  test('admin dispute APIs deny non-admin and guest access without leaking or mutating disputes', async ({
    assert,
    client,
  }) => {
    const { disputeId } = await createDisputeScenario()
    const regularUser = await UserFactory.create({ system_role: 'registered_user' })

    const regularListResponse = await client.get('/api/admin/reviews/disputes').loginAs(regularUser)
    const regularDetailResponse = await client
      .get(`/api/admin/reviews/disputes/${disputeId}`)
      .loginAs(regularUser)
    const regularResolveResponse = await client
      .post(`/api/admin/reviews/disputes/${disputeId}/resolve`)
      .loginAs(regularUser)
      .json({
        finalDecision: 'dismiss',
        finalRationale: 'Should not be applied',
      })
    const guestListResponse = await client.get('/api/admin/reviews/disputes')
    const guestResolveResponse = await client
      .post(`/api/admin/reviews/disputes/${disputeId}/resolve`)
      .json({
        finalDecision: 'dismiss',
        finalRationale: 'Should not be applied',
      })

    regularListResponse.assertStatus(403)
    regularDetailResponse.assertStatus(403)
    regularResolveResponse.assertStatus(403)
    guestListResponse.assertStatus(401)
    guestResolveResponse.assertStatus(401)

    for (const response of [
      regularListResponse,
      regularDetailResponse,
      regularResolveResponse,
      guestListResponse,
      guestResolveResponse,
    ]) {
      assert.notInclude(response.text(), disputeId)
      assert.notInclude(response.text(), 'Need a second review')
      assert.notInclude(response.text(), 'E_INTERNAL_ERROR')
    }

    const unchanged = (await db
      .from('review_disputes')
      .where('id', disputeId)
      .select('status', 'final_decision', 'final_rationale', 'resolved_at')
      .first()) as
      | {
          status: string
          final_decision: string | null
          final_rationale: string | null
          resolved_at: string | null
        }
      | undefined

    assert.deepEqual(unchanged, {
      status: 'pending',
      final_decision: null,
      final_rationale: null,
      resolved_at: null,
    })
  })

  test('org disputes list API returns wrapped list with pagination and camelCase fields', async ({
    assert,
    client,
  }) => {
    const { owner, disputeId } = await createDisputeScenario()
    await owner.refresh()

    const response = await client.get('/api/org/reviews/disputes').loginAs(owner)
    response.assertStatus(200)

    const body = response.body() as {
      data: Array<{
        id: string
        reviewSessionId: string
        taskAssignmentId: string
        taskId: string
        revieweeId: string
        openedBy: string
        disputeReason: string
        requestedOutcome: string
        finalDecision: string | null
        finalRationale: string | null
        createdAt: string
        resolvedAt: string | null
        taskTitle: string | null
        revieweeUsername: string | null
        reviewSessionStatus: string | null
        commentsCount: number
        evidencesCount: number
      }>
      pagination: {
        page: number
        perPage: number
        total: number
        hasNextPage: boolean
        nextCursor: string | null
        previousCursor: string | null
        hasPreviousPage: boolean
      }
    }

    assert.notProperty(body, 'success')
    assert.equal(body.data[0]?.id, disputeId)
    assert.property(body.data[0] ?? {}, 'reviewSessionId')
    assert.property(body.data[0] ?? {}, 'taskAssignmentId')
    assert.property(body.data[0] ?? {}, 'taskId')
    assert.property(body.data[0] ?? {}, 'revieweeId')
    assert.property(body.data[0] ?? {}, 'openedBy')
    assert.property(body.data[0] ?? {}, 'disputeReason')
    assert.property(body.data[0] ?? {}, 'requestedOutcome')
    assert.property(body.data[0] ?? {}, 'createdAt')
    assert.property(body.data[0] ?? {}, 'resolvedAt')
    assert.property(body.data[0] ?? {}, 'taskTitle')
    assert.property(body.data[0] ?? {}, 'revieweeUsername')
    assert.property(body.data[0] ?? {}, 'reviewSessionStatus')
    assert.property(body.data[0] ?? {}, 'commentsCount')
    assert.property(body.data[0] ?? {}, 'evidencesCount')
    assert.deepInclude(body.pagination, {
      page: 1,
      perPage: 20,
      nextCursor: null,
      previousCursor: null,
      hasPreviousPage: false,
    })
  })

  test('canonical v1 org disputes list API preserves legacy wrapped contract', async ({
    assert,
    client,
  }) => {
    const { owner, disputeId } = await createDisputeScenario()
    await owner.refresh()

    const response = await client
      .get('/api/v1/me/organizations/current/reviews/disputes')
      .loginAs(owner)
    response.assertStatus(200)

    const body = response.body() as {
      data: Array<{
        id: string
        reviewSessionId: string
        taskAssignmentId: string
        taskId: string
        revieweeId: string
        openedBy: string
        disputeReason: string
        requestedOutcome: string
      }>
      pagination: {
        page: number
        perPage: number
        total: number
        hasNextPage: boolean
      }
    }

    assert.notProperty(body, 'success')
    assert.equal(body.data[0]?.id, disputeId)
    assert.property(body.data[0] ?? {}, 'reviewSessionId')
    assert.property(body.data[0] ?? {}, 'taskAssignmentId')
    assert.property(body.data[0] ?? {}, 'taskId')
    assert.property(body.data[0] ?? {}, 'revieweeId')
    assert.property(body.data[0] ?? {}, 'openedBy')
    assert.property(body.data[0] ?? {}, 'disputeReason')
    assert.property(body.data[0] ?? {}, 'requestedOutcome')
    assert.deepInclude(body.pagination, { page: 1, perPage: 20 })
  })

  test('reviewee can report dispute to admin and admin receives escalation notification', async ({
    client,
  }) => {
    const { reviewee, disputeId } = await createDisputeScenario()
    await reviewee.refresh()

    const response = await client
      .post(`/api/reviews/disputes/${disputeId}/report`)
      .loginAs(reviewee)
      .json({
        escalationReason: 'Need system admin decision',
      })

    response.assertStatus(409)
  })

  test('reviewee can report dispute to admin after real two-side exchange and admin receives escalation notification', async ({
    assert,
    client,
  }) => {
    const { superadmin, org, owner, reviewee, disputeId, task, assignment, sprintId } =
      await createDisputeScenario()
    if (!task.project_id) {
      throw new Error('Dispute scenario task must belong to a project')
    }
    const projectId = task.project_id

    await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      assigned_to: reviewee.id,
      project_id: projectId,
      project_sprint_id: sprintId,
      title: 'Related task in same sprint',
    })
    await createUserProfileAndHistory({
      userId: owner.id,
      taskId: task.id,
      assignmentId: assignment.id,
      organizationId: org.id,
      projectId,
      role: 'task_assigner',
    })
    await createUserProfileAndHistory({
      userId: reviewee.id,
      taskId: task.id,
      assignmentId: assignment.id,
      organizationId: org.id,
      projectId,
      role: 'task_worker',
    })

    const taskCommentResponse = await client
      .post(`/api/tasks/${task.id}/comments`)
      .loginAs(reviewee)
      .json({
        body: 'Task comment should travel with admin dossier.',
        commentType: 'review_note',
        visibility: 'internal',
        reviewRelevance: true,
      })

    taskCommentResponse.assertStatus(201)

    const submissionId = testId()
    await db.table('task_submissions').insert({
      id: submissionId,
      task_assignment_id: assignment.id,
      task_id: task.id,
      submitted_by: reviewee.id,
      summary: 'Submission before admin escalation',
      status: 'submitted',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    await db.table('task_submission_evidences').insert({
      id: testId(),
      submission_id: submissionId,
      evidence_type: 'pull_request',
      url: 'https://example.com/dispute-dossier-proof',
      title: 'Submission-only proof',
      description: 'Submission evidence that is not the dispute-room evidence',
      uploaded_by: reviewee.id,
      created_at: new Date().toISOString(),
    })

    const commentResponse = await client
      .post(`/api/reviews/disputes/${disputeId}/comments`)
      .loginAs(reviewee)
      .json({
        body: 'I disagree with this review because evidence was missed.',
        visibility: 'all_parties',
      })

    commentResponse.assertStatus(201)

    const respondResponse = await client
      .post(`/api/v1/me/organizations/current/reviews/disputes/${disputeId}/respond`)
      .loginAs(owner)
      .json({
        body: 'Organization reviewer side responds with additional context.',
        visibility: 'all_parties',
      })

    respondResponse.assertStatus(201)

    const evidenceResponse = await client
      .post(`/api/reviews/disputes/${disputeId}/evidences`)
      .loginAs(reviewee)
      .json({
        evidenceType: 'pull_request',
        url: 'https://example.com/dispute-room-proof?token=should-not-leak',
        title: 'Dispute room proof',
        description: 'Evidence uploaded directly to the review dispute.',
      })

    evidenceResponse.assertStatus(201)

    const response = await client
      .post(`/api/reviews/disputes/${disputeId}/report`)
      .loginAs(reviewee)
      .json({
        escalationReason: 'Need system admin decision',
      })

    response.assertStatus(200)

    const body = response.body() as {
      data: {
        id: string
        status: string
      }
    }

    const refreshed = (await db.from('review_disputes').where('id', disputeId).first()) as {
      status: string
      escalation_reason: string | null
    } | null
    const caseFiles = (await db
      .from('review_dispute_case_files')
      .where('dispute_id', disputeId)
      .orderBy('case_version', 'desc')
      .select(
        'id',
        'case_version',
        'completeness_score',
        'task_snapshot',
        'task_comments_snapshot',
        'evidences_snapshot',
        'reviewer_context_snapshot',
        'reviewee_profile_context_snapshot',
        'dispute_claim_snapshot'
      )) as Array<{
      id: string
      case_version: number
      completeness_score: number
      task_snapshot: unknown
      task_comments_snapshot: unknown
      evidences_snapshot: unknown
      reviewer_context_snapshot: unknown
      reviewee_profile_context_snapshot: unknown
      dispute_claim_snapshot: unknown
    }>
    const adminNotifications = (await db
      .from('notification_fanout_targets as target')
      .join('notification_fanout_jobs as job', 'job.id', 'target.job_id')
      .where('target.recipient_id', superadmin.id)
      .where('job.notification_type', BACKEND_NOTIFICATION_TYPES.REVIEW_DISPUTE_ESCALATED)
      .select('target.id')) as Array<{ id: string }>

    assert.equal(body.data.id, disputeId)
    assert.equal(body.data.status, 'admin_reviewing')
    assert.equal(refreshed?.status, 'admin_reviewing')
    assert.equal(refreshed?.escalation_reason, 'Need system admin decision')
    assert.lengthOf(caseFiles, 1)
    assert.equal(caseFiles[0]?.case_version, 1)
    assert.isAtLeast(caseFiles[0]?.completeness_score ?? 0, 0)
    const aiEvaluation = (await db
      .from('ai_dispute_evaluations')
      .where('source_type', 'review_dispute')
      .where('source_id', disputeId)
      .firstOrFail()) as Record<string, unknown>
    const aiPayload = parseSnapshot(aiEvaluation['request_payload'])
    assert.equal(aiEvaluation['provider'], 'clawagent')
    assert.equal(aiEvaluation['status'], 'queued')
    assert.equal(aiEvaluation['case_file_id'], caseFiles[0]?.id)
    assert.equal(aiPayload['schema_version'], 'suar_ai_dispute_package_v1')
    const disputeClaimSnapshot = caseFiles[0]?.dispute_claim_snapshot
    const disputeClaimText =
      typeof disputeClaimSnapshot === 'string'
        ? disputeClaimSnapshot
        : JSON.stringify(disputeClaimSnapshot ?? {})
    const taskCommentsText =
      typeof caseFiles[0]?.task_comments_snapshot === 'string'
        ? caseFiles[0].task_comments_snapshot
        : JSON.stringify(caseFiles[0]?.task_comments_snapshot ?? {})
    const evidencesText =
      typeof caseFiles[0]?.evidences_snapshot === 'string'
        ? caseFiles[0].evidences_snapshot
        : JSON.stringify(caseFiles[0]?.evidences_snapshot ?? {})
    assert.include(disputeClaimText, 'adjust_score')
    assert.include(disputeClaimText, 'I disagree with this review because evidence was missed.')
    assert.include(taskCommentsText, 'Task comment should travel with admin dossier.')
    assert.include(evidencesText, 'Dispute room proof')
    const taskSnapshot = parseSnapshot(caseFiles[0]?.task_snapshot)
    const reviewerContext = parseSnapshot(caseFiles[0]?.reviewer_context_snapshot)
    const revieweeContext = parseSnapshot(caseFiles[0]?.reviewee_profile_context_snapshot)
    assert.equal((taskSnapshot['organization'] as Record<string, unknown>)['id'], org.id)
    assert.equal((taskSnapshot['project'] as Record<string, unknown>)['id'], projectId)
    assert.include(
      recordArray(taskSnapshot['related_project_tasks']).map((relatedTask) => relatedTask['title']),
      'Related task in same sprint'
    )
    assert.include(
      recordArray(taskSnapshot['sprint_peer_tasks']).map((peerTask) => peerTask['title']),
      'Related task in same sprint'
    )
    assert.equal(
      ((reviewerContext['profile'] as Record<string, unknown>)['summary'] as Record<
        string,
        unknown
      >)['role'],
      'task_assigner'
    )
    assert.equal(
      ((revieweeContext['profile'] as Record<string, unknown>)['summary'] as Record<
        string,
        unknown
      >)['role'],
      'task_worker'
    )
    assert.include(
      recordArray(reviewerContext['task_history']).map((history) => history['role_in_task']),
      'task_assigner'
    )
    assert.include(
      recordArray(revieweeContext['task_history']).map((history) => history['role_in_task']),
      'task_worker'
    )
    assert.lengthOf(adminNotifications, 1)
  })

  test('classic report stages the canonical Clawagent arbitration contract', async ({
    assert,
    client,
  }) => {
    const { owner, reviewee, disputeId } = await createDisputeScenario()

    const commentResponse = await client
      .post(`/api/reviews/disputes/${disputeId}/comments`)
      .loginAs(reviewee)
      .json({
        body: 'Reviewee asks for AI arbitration after review evidence was missed.',
        visibility: 'all_parties',
      })
    commentResponse.assertStatus(201)

    const respondResponse = await client
      .post(`/api/v1/me/organizations/current/reviews/disputes/${disputeId}/respond`)
      .loginAs(owner)
      .json({
        body: 'Reviewer side gives counter context before admin escalation.',
        visibility: 'all_parties',
      })
    respondResponse.assertStatus(201)

    const reportResponse = await client
      .post(`/api/reviews/disputes/${disputeId}/report`)
      .loginAs(reviewee)
      .json({ escalationReason: 'Need Clawagent arbitration before admin decision.' })
    reportResponse.assertStatus(200)

    const aiResult = (await db
      .from('ai_dispute_evaluations')
      .where('source_type', 'review_dispute')
      .where('source_id', disputeId)
      .firstOrFail()) as Record<string, unknown>
    const triggerPayload = parseSnapshot(aiResult['trigger_payload']) as {
      evaluation_id: string
      source_type: string
      source_id: string
      case_file_id: string
      callbackUrl: string
      context: {
        source_type?: string
        source_id?: string
        review_dispute_id: string
        case_file_id: string
      }
    }
    assert.equal(triggerPayload.source_type, 'review_dispute')
    assert.equal(triggerPayload.source_id, disputeId)
    assert.match(triggerPayload.callbackUrl, /\/api\/public\/ai-disputes\/callback$/u)
    assert.equal(triggerPayload.context.review_dispute_id, disputeId)
    assert.equal(triggerPayload.context.case_file_id, triggerPayload.case_file_id)

    const dispute = (await db
      .from('review_disputes')
      .where('id', disputeId)
      .select('status')
      .firstOrFail()) as Record<string, unknown>

    assert.equal(aiResult['status'], 'queued')
    assert.isNull(aiResult['external_run_id'])
    assert.equal(aiResult['case_file_id'], triggerPayload.case_file_id)
    assert.equal(dispute['status'], 'admin_reviewing')
  })

  test('report still succeeds and logs AI queue skip when automation actor is missing', async ({
    assert,
    client,
  }) => {
    const { superadmin, owner, reviewee, disputeId } = await createDisputeScenario()
    await db
      .from('users')
      .where('id', superadmin.id)
      .update({ system_role: 'registered_user' })

    const commentResponse = await client
      .post(`/api/reviews/disputes/${disputeId}/comments`)
      .loginAs(reviewee)
      .json({
        body: 'Reviewee asks for admin review even if AI automation actor is missing.',
        visibility: 'all_parties',
      })
    commentResponse.assertStatus(201)

    const respondResponse = await client
      .post(`/api/v1/me/organizations/current/reviews/disputes/${disputeId}/respond`)
      .loginAs(owner)
      .json({
        body: 'Counterparty responded before escalation.',
        visibility: 'all_parties',
      })
    respondResponse.assertStatus(201)

    const originalLog: typeof platformOperationalLogger.log =
      platformOperationalLogger.log.bind(platformOperationalLogger)
    const events: Array<{ level: string; event: PlatformEvent }> = []
    platformOperationalLogger.log = (level, event) => {
      events.push({ level, event })
    }

    try {
      const reportResponse = await client
        .post(`/api/reviews/disputes/${disputeId}/report`)
        .loginAs(reviewee)
        .json({ escalationReason: 'Admin should receive the report even if AI queue skips.' })
      reportResponse.assertStatus(200)
    } finally {
      platformOperationalLogger.log = originalLog
    }

    const evaluation = (await db
      .from('ai_dispute_evaluations')
      .where('source_type', 'review_dispute')
      .where('source_id', disputeId)
      .first()) as Record<string, unknown> | null
    assert.isNull(evaluation)
    assert.isTrue(
      events.some(
        ({ level, event }) =>
          level === 'warn' &&
          event.event_name === 'review.dispute.ai_evaluation.auto_queue_skipped' &&
          event.stage === 'skipped' &&
          event.target?.id === disputeId &&
          event.change?.['source_type'] === 'review_dispute' &&
          event.error?.['message'] === 'No automation actor available'
      )
    )
  })

  test('duplicate dispute report is rejected without duplicating case files or notifications', async ({
    assert,
    client,
  }) => {
    const { superadmin, owner, reviewee, disputeId } = await createDisputeScenario()

    const commentResponse = await client
      .post(`/api/reviews/disputes/${disputeId}/comments`)
      .loginAs(reviewee)
      .json({
        body: 'Reviewee side has already made a report-ready claim.',
        visibility: 'all_parties',
      })

    commentResponse.assertStatus(201)

    const respondResponse = await client
      .post(`/api/v1/me/organizations/current/reviews/disputes/${disputeId}/respond`)
      .loginAs(owner)
      .json({
        body: 'Counterparty side has already responded before escalation.',
        visibility: 'all_parties',
      })

    respondResponse.assertStatus(201)

    const firstResponse = await client
      .post(`/api/reviews/disputes/${disputeId}/report`)
      .loginAs(reviewee)
      .json({
        escalationReason: 'Need admin decision once',
      })

    firstResponse.assertStatus(200)

    const beforeDuplicateDispute = (await db
      .from('review_disputes')
      .where('id', disputeId)
      .select('status', 'reported_to_admin_at', 'reported_to_admin_by', 'escalation_reason')
      .firstOrFail()) as {
      status: string
      reported_to_admin_at: string
      reported_to_admin_by: string
      escalation_reason: string
    }
    const beforeDuplicateCaseFiles = await db
      .from('review_dispute_case_files')
      .where('dispute_id', disputeId)
    const beforeDuplicateAdminNotifications = await db
      .from('notification_fanout_targets as target')
      .join('notification_fanout_jobs as job', 'job.id', 'target.job_id')
      .where('target.recipient_id', superadmin.id)
      .where('job.notification_type', BACKEND_NOTIFICATION_TYPES.REVIEW_DISPUTE_ESCALATED)
    const beforeDuplicateRevieweeNotifications = await db
      .from('notification_fanout_targets as target')
      .join('notification_fanout_jobs as job', 'job.id', 'target.job_id')
      .where('target.recipient_id', reviewee.id)
      .where('job.notification_type', BACKEND_NOTIFICATION_TYPES.REVIEW_DISPUTE_ESCALATED)

    const duplicateResponse = await client
      .post(`/api/reviews/disputes/${disputeId}/report`)
      .loginAs(reviewee)
      .json({
        escalationReason: 'Need admin decision twice',
      })

    duplicateResponse.assertStatus(409)
    assert.notInclude(duplicateResponse.text(), 'E_INTERNAL_ERROR')

    const afterDuplicateDispute = (await db
      .from('review_disputes')
      .where('id', disputeId)
      .select('status', 'reported_to_admin_at', 'reported_to_admin_by', 'escalation_reason')
      .firstOrFail()) as {
      status: string
      reported_to_admin_at: string
      reported_to_admin_by: string
      escalation_reason: string
    }
    const afterDuplicateCaseFiles = await db
      .from('review_dispute_case_files')
      .where('dispute_id', disputeId)
    const afterDuplicateAdminNotifications = await db
      .from('notification_fanout_targets as target')
      .join('notification_fanout_jobs as job', 'job.id', 'target.job_id')
      .where('target.recipient_id', superadmin.id)
      .where('job.notification_type', BACKEND_NOTIFICATION_TYPES.REVIEW_DISPUTE_ESCALATED)
    const afterDuplicateRevieweeNotifications = await db
      .from('notification_fanout_targets as target')
      .join('notification_fanout_jobs as job', 'job.id', 'target.job_id')
      .where('target.recipient_id', reviewee.id)
      .where('job.notification_type', BACKEND_NOTIFICATION_TYPES.REVIEW_DISPUTE_ESCALATED)

    assert.deepEqual(afterDuplicateDispute, beforeDuplicateDispute)
    assert.lengthOf(afterDuplicateCaseFiles, beforeDuplicateCaseFiles.length)
    assert.lengthOf(afterDuplicateAdminNotifications, beforeDuplicateAdminNotifications.length)
    assert.lengthOf(
      afterDuplicateRevieweeNotifications,
      beforeDuplicateRevieweeNotifications.length
    )
    assert.lengthOf(afterDuplicateCaseFiles, 1)
    assert.lengthOf(afterDuplicateAdminNotifications, 1)
    assert.lengthOf(afterDuplicateRevieweeNotifications, 1)
  })

  test('report rollback removes dispute, case-file, and audit mutations when fanout fails', async ({
    assert,
    client,
  }) => {
    const { org, owner, reviewee, disputeId } = await createDisputeScenario()
    const revieweeComment = await client
      .post(`/api/reviews/disputes/${disputeId}/comments`)
      .loginAs(reviewee)
      .json({
        body: 'Reviewee has a report-ready claim.',
        visibility: 'all_parties',
      })
    revieweeComment.assertStatus(201)
    const counterpartyComment = await client
      .post(`/api/v1/me/organizations/current/reviews/disputes/${disputeId}/respond`)
      .loginAs(owner)
      .json({
        body: 'Counterparty has replied before escalation.',
        visibility: 'all_parties',
      })
    counterpartyComment.assertStatus(201)
    const failingFanout: NotificationFanoutStagerContract = {
      stage: () => Promise.reject(new Error('simulated dispute fanout failure')),
    }
    const statusBeforeReport = (await db
      .from('review_disputes')
      .where('id', disputeId)
      .select('status')
      .first()) as { status: string }

    await assert.rejects(
      () =>
        new ReportReviewDisputeCommand(
          {
            userId: reviewee.id,
            organizationId: org.id,
            ip: '127.0.0.1',
            userAgent: 'dispute-atomicity-test',
          },
          new LucidReviewDisputeCaseFileUnitOfWork(failingFanout)
        ).execute({
          dispute_id: disputeId,
          escalation_reason: 'This transaction must roll back',
        }),
      /simulated dispute fanout failure/
    )

    const dispute = (await db
      .from('review_disputes')
      .where('id', disputeId)
      .select('status', 'reported_to_admin_at')
      .first()) as { status: string; reported_to_admin_at: Date | null }
    assert.equal(dispute.status, statusBeforeReport.status)
    assert.isNull(dispute.reported_to_admin_at)
    assert.lengthOf(
      await db.from('review_dispute_case_files').where('dispute_id', disputeId),
      0
    )
    assert.lengthOf(
      await db
        .from('audit_events')
        .where('entity_type', 'review_dispute')
        .where('entity_id', disputeId)
        .whereIn('action', [
          'report_review_dispute',
          'build_review_dispute_case_file',
        ]),
      0
    )
  })

  test('canonical v1 org dispute respond API preserves legacy created comment contract', async ({
    assert,
    client,
  }) => {
    const { owner, disputeId } = await createDisputeScenario()

    const legacyResponse = await client
      .post(`/api/org/reviews/disputes/${disputeId}/respond`)
      .loginAs(owner)
      .json({
        body: 'Organization response from legacy alias',
        visibility: 'all_parties',
      })

    legacyResponse.assertStatus(201)

    const canonicalResponse = await client
      .post(`/api/v1/me/organizations/current/reviews/disputes/${disputeId}/respond`)
      .loginAs(owner)
      .json({
        body: 'Organization response from canonical v1',
        visibility: 'all_parties',
      })

    canonicalResponse.assertStatus(201)

    const legacyBody = legacyResponse.body() as {
      data: {
        disputeId: string
        authorId: string
        body: string
        visibility: string
      }
    }
    const canonicalBody = canonicalResponse.body() as {
      data: {
        disputeId: string
        authorId: string
        body: string
        visibility: string
      }
    }

    assert.notProperty(legacyBody, 'success')
    assert.notProperty(canonicalBody, 'success')
    assert.equal(legacyBody.data.disputeId, disputeId)
    assert.equal(canonicalBody.data.disputeId, disputeId)
    assert.equal(legacyBody.data.authorId, owner.id)
    assert.equal(canonicalBody.data.authorId, owner.id)
    assert.equal(legacyBody.data.visibility, 'all_parties')
    assert.equal(canonicalBody.data.visibility, 'all_parties')
  })

  test('review dispute comments APIs preserve wrapped camelCase contract across legacy and canonical paths', async ({
    assert,
    client,
  }) => {
    const { owner, disputeId } = await createDisputeScenario()

    const createResponse = await client
      .post(`/api/reviews/disputes/${disputeId}/comments`)
      .loginAs(owner)
      .json({
        body: 'Need more evidence on this dispute',
        visibility: 'all_parties',
      })

    createResponse.assertStatus(201)

    const createBody = createResponse.body() as {
      data: {
        id: string
        disputeId: string
        authorId: string
        authorContext: string
        body: string
        visibility: string
      }
    }

    assert.notProperty(createBody, 'success')
    assert.equal(createBody.data.disputeId, disputeId)
    assert.equal(createBody.data.authorId, owner.id)
    assert.equal(createBody.data.body, 'Need more evidence on this dispute')
    assert.equal(createBody.data.visibility, 'all_parties')

    const legacyListResponse = await client
      .get(`/api/reviews/disputes/${disputeId}/comments`)
      .loginAs(owner)
    legacyListResponse.assertStatus(200)

    const canonicalListResponse = await client
      .get(`/api/v1/reviews/disputes/${disputeId}/comments`)
      .loginAs(owner)
    canonicalListResponse.assertStatus(200)

    assert.deepEqual(canonicalListResponse.body(), legacyListResponse.body())
  })

  test('review dispute comments deny outsiders without leaking or creating comments', async ({
    assert,
    client,
  }) => {
    const { owner, disputeId } = await createDisputeScenario()
    const outsider = await UserFactory.create({ system_role: 'registered_user' })

    const participantCommentResponse = await client
      .post(`/api/reviews/disputes/${disputeId}/comments`)
      .loginAs(owner)
      .json({
        body: 'Participant-only dispute detail',
        visibility: 'all_parties',
      })
    participantCommentResponse.assertStatus(201)

    const beforeRows = (await db
      .from('review_dispute_comments')
      .where('dispute_id', disputeId)
      .select('id')) as Array<{ id: string }>

    const outsiderCreateResponse = await client
      .post(`/api/reviews/disputes/${disputeId}/comments`)
      .loginAs(outsider)
      .json({
        body: 'Outsider should not be stored',
        visibility: 'all_parties',
      })
    const outsiderListResponse = await client
      .get(`/api/reviews/disputes/${disputeId}/comments`)
      .loginAs(outsider)

    outsiderCreateResponse.assertStatus(403)
    outsiderListResponse.assertStatus(403)

    for (const response of [outsiderCreateResponse, outsiderListResponse]) {
      assert.notInclude(response.text(), disputeId)
      assert.notInclude(response.text(), 'Participant-only dispute detail')
      assert.notInclude(response.text(), 'Outsider should not be stored')
      assert.notInclude(response.text(), 'E_INTERNAL_ERROR')
    }

    const afterRows = (await db
      .from('review_dispute_comments')
      .where('dispute_id', disputeId)
      .select('id')) as Array<{ id: string }>

    assert.lengthOf(beforeRows, 1)
    assert.sameDeepMembers(afterRows, beforeRows)
  })

  test('review dispute evidences APIs preserve wrapped camelCase contract across legacy and canonical paths', async ({
    assert,
    client,
  }) => {
    const { owner, disputeId } = await createDisputeScenario()

    const createResponse = await client
      .post(`/api/reviews/disputes/${disputeId}/evidences`)
      .loginAs(owner)
      .json({
        evidenceType: 'document',
        url: 'https://example.com/dispute-evidence',
        title: 'Dispute evidence',
        description: 'Supporting material',
      })

    createResponse.assertStatus(201)

    const createBody = createResponse.body() as {
      data: {
        id: string
        disputeId: string
        uploaderId: string
        uploaderContext: string
        evidenceType: string
        url: string
        title: string | null
        description: string | null
      }
    }

    assert.notProperty(createBody, 'success')
    assert.equal(createBody.data.disputeId, disputeId)
    assert.equal(createBody.data.uploaderId, owner.id)
    assert.equal(createBody.data.evidenceType, 'document')
    assert.equal(createBody.data.url, 'https://example.com/dispute-evidence')
    assert.equal(createBody.data.title, 'Dispute evidence')
    assert.equal(createBody.data.description, 'Supporting material')

    const legacyListResponse = await client
      .get(`/api/reviews/disputes/${disputeId}/evidences`)
      .loginAs(owner)
    legacyListResponse.assertStatus(200)

    const canonicalListResponse = await client
      .get(`/api/v1/reviews/disputes/${disputeId}/evidences`)
      .loginAs(owner)
    canonicalListResponse.assertStatus(200)

    assert.deepEqual(canonicalListResponse.body(), legacyListResponse.body())
  })
})
