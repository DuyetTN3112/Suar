import { test } from '@japa/runner'

import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { buildAiDisputeCallbackRequest } from '#modules/reviews/controllers/mappers/request/disputes/ai_dispute_callback_request_mapper'

const VALID_TIMESTAMP = 1_725_000_000
const VALID_SIGNATURE = 'a'.repeat(64)

function transport(body: Record<string, unknown>, headers: Record<string, unknown> = {}) {
  return { body, headers }
}


test.group('', () => {
  test('maps canonical fields, header credentials, aliases, and nested payload aliases', ({ assert }) => {
    const mapped = buildAiDisputeCallbackRequest(
      transport(
        {
          evaluationId: 'evaluation-1',
          reviewDisputeId: 'dispute-1',
          caseFileId: 'case-file-1',
          sourceId: 'source-1',
          status: 'completed',
          confidenceScore: '0.91',
          recommendation: 'uphold_review',
          summary: 'Evidence is consistent',
          responsePayload: {
            actionItems: ['Notify both parties'],
            verdict: { actionItems: ['Review the evidence'] },
          },
        },
        { 'X-Timestamp': String(VALID_TIMESTAMP), 'X-Signature': VALID_SIGNATURE }
      )
    )

    assert.deepEqual(mapped, {
      evaluation_id: 'evaluation-1',
      review_dispute_id: 'dispute-1',
      case_file_id: 'case-file-1',
      source_id: 'source-1',
      status: 'completed',
      timestamp: VALID_TIMESTAMP,
      signature: VALID_SIGNATURE,
      confidence_score: 0.91,
      recommendation: 'uphold_review',
      summary: 'Evidence is consistent',
      response_payload: {
        actionItems: ['Notify both parties'],
        action_items: ['Notify both parties'],
        verdict: {
          actionItems: ['Review the evidence'],
          action_items: ['Review the evidence'],
        },
      },
    })
  })

  test('preserves the legacy snake_case body contract and disputeId evaluation alias', ({ assert }) => {
    const mapped = buildAiDisputeCallbackRequest(
      transport({
        disputeId: 'evaluation-legacy',
        review_dispute_id: 'dispute-legacy',
        case_file_id: 'case-file-legacy',
        sprint_review_dispute_id: 'source-legacy',
        status: 'failed',
        confidence_score: 0.25,
        error_message: 'Provider failed',
        response_payload: { result: 'failed' },
        timestamp: String(VALID_TIMESTAMP),
        signature: VALID_SIGNATURE,
      })
    )

    assert.equal(mapped.evaluation_id, 'evaluation-legacy')
    assert.equal(mapped.review_dispute_id, 'dispute-legacy')
    assert.equal(mapped.case_file_id, 'case-file-legacy')
    assert.equal(mapped.source_id, 'source-legacy')
    assert.equal(mapped.status, 'failed')
    assert.equal(mapped.timestamp, VALID_TIMESTAMP)
    assert.equal(mapped.confidence_score, 0.25)
    assert.equal(mapped.error_message, 'Provider failed')
    assert.deepEqual(mapped.response_payload, { result: 'failed' })
  })

  test('rejects missing or invalid authentication and state fields with canonical validation issues', ({
    assert,
  }) => {
    try {
      buildAiDisputeCallbackRequest(
        transport({
          evaluationId: 42,
          status: 'running',
          timestamp: 'not-a-timestamp',
          signature: 123,
        })
      )
      assert.fail('expected validation exception')
    } catch (error) {
      assert.instanceOf(error, ValidationException)
      assert.deepEqual(
        (error as ValidationException).issues.map((issue) => issue.path).sort(),
        ['evaluationId', 'signature', 'status', 'timestamp']
      )
    }
  })

  test('rejects malformed identifiers, confidence values, and response payloads', ({ assert }) => {
    try {
      buildAiDisputeCallbackRequest(
        transport({
          evaluation_id: 'evaluation-1',
          reviewDisputeId: { id: 'dispute-1' },
          case_file_id: 42,
          sourceId: true,
          status: 'completed',
          confidenceScore: 1.1,
          responsePayload: [],
        }, { 'X-Timestamp': String(VALID_TIMESTAMP), 'X-Signature': VALID_SIGNATURE })
      )
      assert.fail('expected validation exception')
    } catch (error) {
      assert.instanceOf(error, ValidationException)
      assert.deepEqual(
        (error as ValidationException).issues.map((issue) => issue.path).sort(),
        ['caseFileId', 'confidenceScore', 'responsePayload', 'reviewDisputeId', 'sourceId']
      )
    }
  })


})
