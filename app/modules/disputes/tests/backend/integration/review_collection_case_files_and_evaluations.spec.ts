import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import { buildAdminDisputeScenario } from '#modules/reviews/tests/backend/integration/support/review_collection_test_support'

import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { cleanupTestData } from '#tests/helpers/factories'
import { testId } from '#tests/helpers/test_utils'

test.group('Integration | Review collection API standardization - Case files and evaluations', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

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
})
