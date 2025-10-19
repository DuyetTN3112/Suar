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

async function buildAdminDisputeScenario() {
  const superadmin = await UserFactory.createSuperadmin()
  const base = await buildReviewSessionScenario()
  const disputeId = testId()

  await db.table('review_disputes').insert({
    id: disputeId,
    review_session_id: base.session.id,
    task_assignment_id: base.assignment.id,
    task_id: base.task.id,
    reviewee_id: base.reviewee.id,
    opened_by: base.reviewee.id,
    status: 'pending',
    dispute_reason: 'Need admin action',
    disputed_dimensions: JSON.stringify({ quality: true }),
    disputed_skill_reviews: JSON.stringify([]),
    requested_outcome: 'adjust_score',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  })

  return { superadmin, disputeId, ...base }
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

  test('resolve dispute accepts camelCase body and returns wrapped camelCase data', async ({
    assert,
    client,
  }) => {
    const { superadmin, disputeId } = await buildAdminDisputeScenario()

    await db.table('review_dispute_case_files').insert({
      id: testId(),
      dispute_id: disputeId,
      case_version: 1,
      created_by: superadmin.id,
      task_snapshot: JSON.stringify({ id: 'task-1' }),
      required_skills_snapshot: JSON.stringify([{ id: 'required-skill-1' }]),
      acceptance_criteria_snapshot: JSON.stringify({}),
      assignment_snapshot: JSON.stringify({ id: 'assignment-1' }),
      submission_snapshot: JSON.stringify({ id: 'submission-1' }),
      review_snapshot: JSON.stringify({ id: 'review-session-1' }),
      skill_reviews_snapshot: JSON.stringify([{ id: 'skill-review-1' }]),
      evidences_snapshot: JSON.stringify([{ id: 'evidence-1' }]),
      self_assessment_snapshot: JSON.stringify({ summary: 'self assessment' }),
      task_comments_snapshot: JSON.stringify([{ id: 'task-comment-1' }]),
      task_history_snapshot: JSON.stringify([{ id: 'task-history-1' }]),
      reviewee_profile_context_snapshot: JSON.stringify({ reviewee_id: 'reviewee-1' }),
      reviewer_context_snapshot: JSON.stringify({ reviewer_id: 'reviewer-1' }),
      dispute_claim_snapshot: JSON.stringify({
        requested_outcome: 'adjust_score',
        dispute_comments: [
          { author_context: 'reviewee', body: 'Reviewee dispute message' },
          { author_context: 'reviewer', body: 'Reviewer counterparty message' },
        ],
      }),
      completeness_score: 100,
      missing_data: JSON.stringify([]),
      created_at: '2026-01-01T00:00:00.000Z',
    })

    const response = await client
      .post(`/api/admin/reviews/disputes/${disputeId}/resolve`)
      .loginAs(superadmin)
      .json({
        finalDecision: 'adjust_score',
        finalRationale: 'Evidence sufficient for adjustment',
        profileUpdateAction: 'recalculate_after_adjustment',
        reviewerCredibilityAction: 'mark_disputed_review',
      })

    response.assertStatus(201)

    const body = response.body() as {
      data: {
        id: string
        status: string
        resolvedBy: string
        finalDecision: string
        finalRationale: string
      }
    }

    assert.notProperty(body, 'success')
    assert.equal(body.data.id, disputeId)
    assert.equal(body.data.status, 'resolved')
    assert.equal(body.data.resolvedBy, superadmin.id)
    assert.equal(body.data.finalDecision, 'adjust_score')
    assert.equal(body.data.finalRationale, 'Evidence sufficient for adjustment')
  })

  test('resolve dispute blocks normal resolution when admin dossier is incomplete', async ({
    assert,
    client,
  }) => {
    const { superadmin, disputeId } = await buildAdminDisputeScenario()

    const response = await client
      .post(`/api/admin/reviews/disputes/${disputeId}/resolve`)
      .loginAs(superadmin)
      .json({
        finalDecision: 'adjust_score',
        finalRationale: 'Evidence sufficient for adjustment',
        profileUpdateAction: 'recalculate_after_adjustment',
        reviewerCredibilityAction: 'mark_disputed_review',
      })

    response.assertStatus(400)
    assert.include(JSON.stringify(response.body()), 'dossier')
    assert.include(JSON.stringify(response.body()), 'task_snapshot')
  })

  test('resolve dispute allows readiness override with explicit reason', async ({
    assert,
    client,
  }) => {
    const { superadmin, disputeId } = await buildAdminDisputeScenario()

    const response = await client
      .post(`/api/admin/reviews/disputes/${disputeId}/resolve`)
      .loginAs(superadmin)
      .json({
        finalDecision: 'dismiss_dispute',
        finalRationale: 'Admin verified legacy records outside the incomplete case file.',
        profileUpdateAction: 'no_action',
        reviewerCredibilityAction: 'no_action',
        overrideReadiness: true,
        overrideReason: 'Legacy dispute predates case file builder; admin verified source records.',
      })

    response.assertStatus(201)
    const body = response.body() as {
      data: {
        id: string
        status: string
        finalDecision: string
      }
    }

    assert.equal(body.data.id, disputeId)
    assert.equal(body.data.status, 'resolved')
    assert.equal(body.data.finalDecision, 'dismiss_dispute')
  })

  test('start ai evaluation returns wrapped camelCase data without success envelope', async ({
    assert,
    client,
  }) => {
    const { superadmin, disputeId } = await buildAdminDisputeScenario()
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

    const response = await client
      .post(`/api/admin/reviews/disputes/${disputeId}/ai-evaluations`)
      .loginAs(superadmin)
      .json({
        provider: 'ai_council',
      })

    response.assertStatus(201)

    const body = response.body() as {
      data: {
        disputeId: string
        caseFileId: string
        provider: string
        status: string
        requestPayload: { caseId: string }
      }
    }

    assert.notProperty(body, 'success')
    assert.equal(body.data.disputeId, disputeId)
    assert.equal(body.data.caseFileId, caseFileId)
    assert.equal(body.data.provider, 'ai_council')
    assert.equal(body.data.status, 'queued')
    assert.equal(body.data.requestPayload.caseId, disputeId)
  })

  test('start ai evaluation triggers public Clawagent arbitration contract by default', async ({
    assert,
    client,
  }) => {
    const { superadmin, disputeId } = await buildAdminDisputeScenario()
    const caseFileId = testId()

    await db.table('review_dispute_case_files').insert({
      id: caseFileId,
      dispute_id: disputeId,
      case_version: 1,
      created_by: superadmin.id,
      task_snapshot: JSON.stringify({ task_id: 'task-1', title: 'AI arbitration task' }),
      required_skills_snapshot: JSON.stringify([]),
      acceptance_criteria_snapshot: JSON.stringify({}),
      assignment_snapshot: JSON.stringify({}),
      submission_snapshot: JSON.stringify({}),
      review_snapshot: JSON.stringify({ overall_feedback: 'Review follows rubric.' }),
      skill_reviews_snapshot: JSON.stringify([]),
      evidences_snapshot: JSON.stringify([]),
      self_assessment_snapshot: JSON.stringify({}),
      task_comments_snapshot: JSON.stringify([]),
      task_history_snapshot: JSON.stringify([]),
      reviewee_profile_context_snapshot: JSON.stringify({}),
      reviewer_context_snapshot: JSON.stringify({}),
      dispute_claim_snapshot: JSON.stringify({ requested_outcome: 'adjust_score' }),
      completeness_score: 100,
      missing_data: JSON.stringify([]),
      created_at: '2026-01-01T00:00:00.000Z',
    })

    const originalFetch = globalThis.fetch
    const originalNodeEnv = process.env['NODE_ENV']
    const originalClawagentUrl = process.env['CLAWAGENT_API_URL']
    const originalCallbackUrl = process.env['SUAR_CALLBACK_URL']
    const originalAppUrl = process.env['APP_URL']
    const originalSuarDisputeApiKey = process.env['SUAR_DISPUTE_API_KEY']
    const originalDevportalApiKey = process.env['DEVPORTAL_API_KEY_SECRET']
    const requests: { url: string; init: RequestInit | undefined }[] = []

    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      requests.push({ url: String(input), init })
      const payload = JSON.parse(String(init?.body ?? '{}')) as { evaluation_id?: string }
      return new Response(
        JSON.stringify({ ok: true, status: 'accepted', evaluation_id: payload.evaluation_id }),
        { status: 202 }
      )
    }) as typeof fetch

    process.env['NODE_ENV'] = 'production'
    delete process.env['CLAWAGENT_API_URL']
    delete process.env['SUAR_CALLBACK_URL']
    process.env['APP_URL'] = 'https://suar.example'
    process.env['SUAR_DISPUTE_API_KEY'] = 'suar-public-secret'
    process.env['DEVPORTAL_API_KEY_SECRET'] = 'legacy-secret'

    try {
      const response = await client
        .post(`/api/admin/reviews/disputes/${disputeId}/ai-evaluations`)
        .loginAs(superadmin)
        .json({
          provider: 'ai_council',
        })

      response.assertStatus(201)
      const body = response.body() as {
        data: {
          status: string
          externalRunId: string | null
        }
      }
      assert.lengthOf(requests, 1)
      const request = requests[0]
      if (!request) throw new Error('Expected Clawagent request to be captured')
      assert.equal(request.url, 'http://localhost:8080/api/public/disputes/arbitrate')

      const headers = new Headers(request.init?.headers)
      assert.equal(headers.get('x-api-key'), 'suar-public-secret')

      const triggerPayload = JSON.parse(String(request.init?.body)) as {
        schema_version: string
        disputeId: string
        evaluation_id: string
        review_dispute_id: string
        case_file_id: string
        callbackUrl: string
        context: {
          schema_version: string
          review_dispute_id: string
          case_file_id: string
          suar_identifiers: {
            review_dispute_id: string
            case_file_id: string
          }
        }
      }

      assert.equal(triggerPayload.schema_version, 'suar_clawagent_dispute_trigger_v1')
      assert.equal(triggerPayload.disputeId, triggerPayload.evaluation_id)
      assert.equal(triggerPayload.review_dispute_id, disputeId)
      assert.equal(triggerPayload.case_file_id, caseFileId)
      assert.equal(triggerPayload.callbackUrl, 'https://suar.example/api/public/ai-disputes/callback')
      assert.equal(triggerPayload.context.schema_version, 'suar_ai_dispute_package_v1')
      assert.equal(triggerPayload.context.review_dispute_id, disputeId)
      assert.equal(triggerPayload.context.case_file_id, caseFileId)
      assert.equal(triggerPayload.context.suar_identifiers.review_dispute_id, disputeId)
      assert.equal(triggerPayload.context.suar_identifiers.case_file_id, caseFileId)
      assert.equal(body.data.status, 'processing')
      assert.equal(body.data.externalRunId, triggerPayload.evaluation_id)

      const dispute = (await db
        .from('review_disputes')
        .where('id', disputeId)
        .select('status')
        .first()) as { status: string } | null
      const evaluation = (await db
        .from('ai_dispute_evaluations')
        .where('id', triggerPayload.evaluation_id)
        .select('external_run_id', 'status')
        .first()) as { external_run_id: string | null; status: string } | null

      assert.equal(dispute?.status, 'ai_reviewing')
      assert.equal(evaluation?.status, 'processing')
      assert.equal(evaluation?.external_run_id, triggerPayload.evaluation_id)
    } finally {
      globalThis.fetch = originalFetch
      process.env['NODE_ENV'] = originalNodeEnv
      if (originalClawagentUrl === undefined) delete process.env['CLAWAGENT_API_URL']
      else process.env['CLAWAGENT_API_URL'] = originalClawagentUrl
      if (originalCallbackUrl === undefined) delete process.env['SUAR_CALLBACK_URL']
      else process.env['SUAR_CALLBACK_URL'] = originalCallbackUrl
      if (originalAppUrl === undefined) delete process.env['APP_URL']
      else process.env['APP_URL'] = originalAppUrl
      if (originalSuarDisputeApiKey === undefined) delete process.env['SUAR_DISPUTE_API_KEY']
      else process.env['SUAR_DISPUTE_API_KEY'] = originalSuarDisputeApiKey
      if (originalDevportalApiKey === undefined) delete process.env['DEVPORTAL_API_KEY_SECRET']
      else process.env['DEVPORTAL_API_KEY_SECRET'] = originalDevportalApiKey
    }
  })
})
