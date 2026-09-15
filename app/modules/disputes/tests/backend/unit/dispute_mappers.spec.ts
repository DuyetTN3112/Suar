import { test } from '@japa/runner'

import {
  buildCreateReviewDisputeCommentDTO,
  buildCreateReviewDisputeDTO,
  buildReportReviewDisputeDTO,
  buildResolveReviewDisputeDTO,
  buildRespondToReviewDisputeDTO,
  buildStartAiDisputeEvaluationDTO,
} from '#modules/disputes/controllers/mappers/review_dispute_request_mapper'
import {
  mapReviewCommentCollectionApiBody,
  mapReviewDisputeCommentApiBody,
  mapReviewDisputeDataApiBody,
  mapReviewDisputeEvidenceApiBody,
  mapReviewDisputeListApiBody,
  mapReviewEvidenceCollectionApiBody,
} from '#modules/disputes/controllers/mappers/review_dispute_response_mapper'

function fakeRequest(input: Record<string, unknown>) {
  return {
    input(key: string, fallback?: unknown) {
      return Object.hasOwn(input, key) ? input[key] : fallback
    },
  }
}

test.group('Unit | Dispute Controller Mappers', () => {
  test('create review dispute request mapper accepts camelCase and snake_case inputs', ({
    assert,
  }) => {
    const camelCaseDto = buildCreateReviewDisputeDTO(
      fakeRequest({
        reviewSessionId: 'session-1',
        disputeReason: 'Need second opinion',
        disputedDimensions: { quality: true },
        disputedSkillReviews: [{ skillId: 'skill-1' }],
        requestedOutcome: 'adjust_score',
      }) as never
    )

    assert.equal(camelCaseDto.review_session_id, 'session-1')
    assert.equal(camelCaseDto.dispute_reason, 'Need second opinion')
    assert.deepEqual(camelCaseDto.disputed_dimensions, { quality: true })
    assert.deepEqual(camelCaseDto.disputed_skill_reviews, [{ skillId: 'skill-1' }])
    assert.equal(camelCaseDto.requested_outcome, 'adjust_score')

    const snakeCaseDto = buildCreateReviewDisputeDTO(
      fakeRequest({
        review_session_id: 'session-2',
        dispute_reason: 'Need escalation',
        disputed_dimensions: { timeliness: true },
        disputed_skill_reviews: [{ skill_id: 'skill-2' }],
        requestedOutcome: 'request_re_review',
      }) as never
    )

    assert.equal(snakeCaseDto.review_session_id, 'session-2')
    assert.equal(snakeCaseDto.dispute_reason, 'Need escalation')
    assert.deepEqual(snakeCaseDto.disputed_dimensions, { timeliness: true })
    assert.deepEqual(snakeCaseDto.disputed_skill_reviews, [{ skill_id: 'skill-2' }])
    assert.equal(snakeCaseDto.requested_outcome, 'request_re_review')
  })

  test('resolve dispute and AI evaluation request mappers accept camelCase inputs', ({ assert }) => {
    const resolveDto = buildResolveReviewDisputeDTO(
      fakeRequest({
        finalDecision: 'adjust_score',
        finalRationale: 'Valid dispute',
        profileUpdateAction: 'recalculate_after_adjustment',
        reviewerCredibilityAction: 'mark_disputed_review',
        overrideReadiness: true,
        overrideReason: 'Verified legacy records',
      }) as never,
      'dispute-1'
    )

    assert.equal(resolveDto.dispute_id, 'dispute-1')
    assert.equal(resolveDto.final_decision, 'adjust_score')
    assert.equal(resolveDto.reviewer_credibility_action, 'mark_disputed_review')
    assert.isTrue(resolveDto.override_readiness)
    assert.equal(resolveDto.override_reason, 'Verified legacy records')

    const aiDto = buildStartAiDisputeEvaluationDTO(
      fakeRequest({
        provider: 'clawagent',
        sourceType: 'task_review_workflow',
      }) as never,
      'dispute-2'
    )

    assert.equal(aiDto.dispute_id, 'dispute-2')
    assert.equal(aiDto.provider, 'clawagent')
    assert.equal(aiDto.source_type, 'task_review_workflow')
  })

  test('dispute comment and report request mappers accept valid payloads', ({ assert }) => {
    const commentDto = buildCreateReviewDisputeCommentDTO(
      fakeRequest({
        body: 'Dispute comment text',
        visibility: 'admin_only',
      }) as never,
      'dispute-1'
    )
    assert.equal(commentDto.dispute_id, 'dispute-1')
    assert.equal(commentDto.body, 'Dispute comment text')
    assert.equal(commentDto.visibility, 'admin_only')

    const respondDto = buildRespondToReviewDisputeDTO(
      fakeRequest({
        body: 'Dispute response text',
        visibility: 'all_parties',
      }) as never,
      'dispute-1'
    )
    assert.equal(respondDto.dispute_id, 'dispute-1')
    assert.equal(respondDto.body, 'Dispute response text')

    const reportDto = buildReportReviewDisputeDTO(
      fakeRequest({
        escalationReason: 'Escalation to arbitration',
      }) as never,
      'dispute-1'
    )
    assert.equal(reportDto.dispute_id, 'dispute-1')
    assert.equal(reportDto.escalation_reason, 'Escalation to arbitration')
  })

  test('dispute response mappers serialize dispute models and collections', ({ assert }) => {
    const commentResult = mapReviewDisputeCommentApiBody({
      id: 'comment-1',
      dispute_id: 'dispute-1',
      body: 'Hello',
    })
    assert.equal(commentResult.data.id, 'comment-1')
    assert.equal(commentResult.data.disputeId, 'dispute-1')

    const commentCollection = mapReviewCommentCollectionApiBody([
      { id: 'c-1', dispute_id: 'd-1', body: 'Comment 1' },
      { id: 'c-2', dispute_id: 'd-1', body: 'Comment 2' },
    ])
    assert.lengthOf(commentCollection.data, 2)
    assert.equal(commentCollection.data[0]?.disputeId, 'd-1')

    const evidenceResult = mapReviewDisputeEvidenceApiBody({
      id: 'ev-1',
      dispute_id: 'dispute-1',
      url: 'https://example.com/evidence',
      title: 'Evidence title',
    })
    assert.equal(evidenceResult.data.id, 'ev-1')
    assert.equal(evidenceResult.data.disputeId, 'dispute-1')
    assert.equal(evidenceResult.data.url, 'https://example.com/evidence')

    const evidenceCollection = mapReviewEvidenceCollectionApiBody([
      { id: 'ev-1', dispute_id: 'd-1', url: 'https://example.com/1' },
    ])
    assert.lengthOf(evidenceCollection.data, 1)

    const disputeData = mapReviewDisputeDataApiBody({
      id: 'dispute-1',
      status: 'pending',
    })
    assert.equal(disputeData.data['id'], 'dispute-1')
    assert.equal(disputeData.data['status'], 'pending')

    const listResult = mapReviewDisputeListApiBody(
      [
        {
          id: 'disp-1',
          review_session_id: 'sess-1',
          task_assignment_id: 'assign-1',
          task_id: 'task-1',
          reviewee_id: 'user-1',
          opened_by: 'user-1',
          status: 'pending',
          dispute_reason: 'Unfair score',
          requested_outcome: 'adjust_score',
          final_decision: null,
          final_rationale: null,
          created_at: '2026-01-01T00:00:00.000Z',
          resolved_at: null,
          task_title: 'Task title',
          reviewee_username: 'worker1',
          review_session_status: 'completed',
          comments_count: 2,
          evidences_count: 1,
        },
      ],
      {
        total: 1,
        per_page: 20,
        current_page: 1,
        last_page: 1,
      }
    )
    assert.lengthOf(listResult.data, 1)
    assert.equal(listResult.data[0]?.id, 'disp-1')
    assert.equal(listResult.data[0]?.taskTitle, 'Task title')
    assert.equal(listResult.pagination.total, 1)
  })
})
