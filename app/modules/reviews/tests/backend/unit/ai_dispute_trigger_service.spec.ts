import { test } from '@japa/runner'

import { ClawagentDisputeClient } from '#modules/reviews/infra/adapters/disputes/clawagent_dispute_client'
import {
  LucidAiDisputeEvaluationGateway,
  calculateAiDisputeRetryDelayMs,
} from '#modules/reviews/infra/adapters/disputes/lucid_ai_dispute_evaluation_gateway'

const unusedClient = new ClawagentDisputeClient({
  url: 'https://clawagent.invalid/disputes',
})

test.group('AI dispute trigger retry policy', () => {
  test('uses capped exponential backoff with bounded jitter', ({ assert }) => {
    assert.equal(
      calculateAiDisputeRetryDelayMs(1, 1_000, 10_000, () => 0),
      500
    )
    assert.equal(
      calculateAiDisputeRetryDelayMs(2, 1_000, 10_000, () => 1),
      2_000
    )
    assert.equal(
      calculateAiDisputeRetryDelayMs(20, 1_000, 10_000, () => 1),
      10_000
    )
    assert.equal(
      calculateAiDisputeRetryDelayMs(20, 1_000, 10_000, () => -10),
      5_000
    )
  })

  test('rejects unsafe reconciliation configuration at startup', ({ assert }) => {
    assert.throws(
      () => new LucidAiDisputeEvaluationGateway(unusedClient, { maxAttempts: 0 }),
      /maxAttempts/
    )
    assert.throws(
      () =>
        new LucidAiDisputeEvaluationGateway(unusedClient, {
          retryBaseMs: 5_000,
          retryCapMs: 1_000,
        }),
      /retryCapMs/
    )
    assert.throws(
      () =>
        new LucidAiDisputeEvaluationGateway(unusedClient, {
          reconciliationBatchSize: 101,
        }),
      /reconciliationBatchSize/
    )
  })

  test('does not begin reconciliation after shutdown has started', async ({ assert }) => {
    const controller = new AbortController()
    controller.abort()
    const service = new LucidAiDisputeEvaluationGateway(unusedClient)

    const result = await service.reconcileOnce(controller.signal)

    assert.deepEqual(result, {
      recoveredStale: 0,
      exhausted: 0,
      selected: 0,
      accepted: 0,
      retried: 0,
      permanentFailures: 0,
      skipped: 0,
      shutdownDeferred: 0,
    })
  })
})
