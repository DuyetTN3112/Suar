import { test } from '@japa/runner'

import { buildClawagentDisputeTriggerPayload } from '#modules/reviews/actions/commands/start_ai_dispute_evaluation_command'

test.group('AI dispute trigger payload', () => {
  test('keeps legacy disputeId while exposing explicit evaluation and review dispute ids', ({
    assert,
  }) => {
    const payload = buildClawagentDisputeTriggerPayload({
      evaluationId: 'ai-eval-1',
      reviewDisputeId: 'review-dispute-1',
      caseFileId: 'case-file-1',
      title: 'Dispute for case file case-file-1',
      claimantArgument: 'Score too low.',
      respondentArgument: 'Review score follows rubric.',
      requestPayload: {
        schema_version: 'suar_ai_dispute_package_v1',
        review_dispute_id: 'review-dispute-1',
        case_file_id: 'case-file-1',
      } as never,
      callbackUrl: 'http://localhost:3333/api/public/ai-disputes/callback',
    })

    assert.equal(payload.schema_version, 'suar_clawagent_dispute_trigger_v1')
    assert.equal(payload.disputeId, 'ai-eval-1')
    assert.equal(payload.evaluation_id, 'ai-eval-1')
    assert.equal(payload.review_dispute_id, 'review-dispute-1')
    assert.equal(payload.case_file_id, 'case-file-1')
    assert.equal(payload.context.review_dispute_id, 'review-dispute-1')
    assert.equal(payload.callbackUrl, 'http://localhost:3333/api/public/ai-disputes/callback')
  })
})
