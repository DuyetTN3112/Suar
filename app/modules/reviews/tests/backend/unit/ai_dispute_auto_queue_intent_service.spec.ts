import { test } from '@japa/runner'

import {
  ProcessAiDisputeAutoQueueIntentsCommand,
  calculateAiDisputeAutoQueueRetryAt,
  type AiDisputeAutoQueueIntentJob,
  type AiDisputeAutoQueueIntentRepository,
  type ClaimAiDisputeAutoQueueIntentInput,
  type ClaimAiDisputeAutoQueueIntentsInput,
  type CompleteAiDisputeAutoQueueIntentInput,
  type FailAiDisputeAutoQueueIntentInput,
} from '#modules/reviews/actions/commands/process_ai_dispute_auto_queue_intents_command'

const NOW = new Date('2026-07-23T12:00:00.000Z')

function job(attemptCount = 1): AiDisputeAutoQueueIntentJob {
  return {
    id: '10000000-0000-4000-8000-000000000001',
    sourceType: 'review_dispute',
    sourceId: '20000000-0000-4000-8000-000000000001',
    organizationId: '30000000-0000-4000-8000-000000000001',
    requestId: 'request-1',
    traceId: 'trace-1',
    workflowId: 'workflow-1',
    attemptCount,
    leaseToken: '40000000-0000-4000-8000-000000000001',
  }
}

class FakeIntentRepository implements AiDisputeAutoQueueIntentRepository {
  acknowledged: CompleteAiDisputeAutoQueueIntentInput[] = []
  failures: FailAiDisputeAutoQueueIntentInput[] = []
  claimInputs: ClaimAiDisputeAutoQueueIntentsInput[] = []
  hasEvaluationCalls = 0

  constructor(
    private readonly jobs: AiDisputeAutoQueueIntentJob[],
    public evaluationExists: boolean,
    private readonly leaseMutationSucceeds = true
  ) {}

  claimBatch(input: ClaimAiDisputeAutoQueueIntentsInput) {
    this.claimInputs.push(input)
    return Promise.resolve(this.jobs)
  }

  claimSource(_input: ClaimAiDisputeAutoQueueIntentInput) {
    return Promise.resolve(this.jobs[0] ?? null)
  }

  hasEvaluation() {
    this.hasEvaluationCalls += 1
    return Promise.resolve(this.evaluationExists)
  }

  acknowledge(input: CompleteAiDisputeAutoQueueIntentInput) {
    this.acknowledged.push(input)
    return Promise.resolve(this.leaseMutationSucceeds)
  }

  fail(input: FailAiDisputeAutoQueueIntentInput) {
    this.failures.push(input)
    return Promise.resolve(this.leaseMutationSucceeds)
  }
}

test.group('AI dispute auto-queue intent recovery', () => {
  test('acknowledges the crash window when an evaluation already exists', async ({ assert }) => {
    const repository = new FakeIntentRepository([job()], true)
    let processorCalls = 0
    const worker = new ProcessAiDisputeAutoQueueIntentsCommand(
      repository,
      () => {
        processorCalls += 1
        return Promise.resolve()
      },
      { now: () => NOW }
    )

    const result = await worker.executeBatch('worker-1')

    assert.equal(processorCalls, 1)
    assert.deepEqual(result, {
      claimed: 1,
      processed: 1,
      retried: 0,
      deadLettered: 0,
      leaseLost: 0,
      shutdownDeferred: 0,
    })
    assert.lengthOf(repository.acknowledged, 1)
    assert.lengthOf(repository.failures, 0)
  })

  test('retries with bounded exponential backoff when staging is not observable', async ({
    assert,
  }) => {
    const repository = new FakeIntentRepository([job(3)], false)
    const worker = new ProcessAiDisputeAutoQueueIntentsCommand(
      repository,
      () => Promise.resolve(),
      {
        maxAttempts: 5,
        retryBaseMs: 1_000,
        retryCapMs: 10_000,
        now: () => NOW,
      }
    )

    const result = await worker.executeBatch('worker-1')

    assert.equal(result.retried, 1)
    assert.equal(result.deadLettered, 0)
    assert.lengthOf(repository.failures, 1)
    assert.equal(repository.failures[0]?.errorCode, 'AI_DISPUTE_EVALUATION_NOT_STAGED')
    assert.equal(repository.failures[0]?.availableAt?.toISOString(), '2026-07-23T12:00:04.000Z')
  })

  test('dead-letters an intent after its retry budget is exhausted', async ({ assert }) => {
    const repository = new FakeIntentRepository([job(4)], false)
    const worker = new ProcessAiDisputeAutoQueueIntentsCommand(
      repository,
      () => Promise.reject(new TypeError('simulated downstream failure')),
      { maxAttempts: 4, now: () => NOW }
    )

    const result = await worker.executeBatch('worker-1')

    assert.equal(result.deadLettered, 1)
    assert.equal(result.retried, 0)
    assert.lengthOf(repository.failures, 1)
    assert.equal(repository.failures[0]?.errorCode, 'TypeError')
    assert.isNull(repository.failures[0]?.availableAt)
  })

  test('does not dispatch again after a crashed final attempt is reclaimed', async ({ assert }) => {
    const repository = new FakeIntentRepository([job(5)], false)
    let processorCalls = 0
    const worker = new ProcessAiDisputeAutoQueueIntentsCommand(
      repository,
      () => {
        processorCalls += 1
        return Promise.resolve()
      },
      { maxAttempts: 4, now: () => NOW }
    )

    const result = await worker.executeBatch('recovery-worker')

    assert.equal(processorCalls, 0)
    assert.equal(result.deadLettered, 1)
    assert.lengthOf(repository.failures, 1)
    assert.equal(repository.failures[0]?.errorCode, 'AI_DISPUTE_AUTO_QUEUE_RETRY_EXHAUSTED')
    assert.isNull(repository.failures[0]?.availableAt)
  })

  test('reports lease loss instead of acknowledging work owned by another worker', async ({
    assert,
  }) => {
    const repository = new FakeIntentRepository([job()], true, false)
    const worker = new ProcessAiDisputeAutoQueueIntentsCommand(
      repository,
      () => Promise.resolve(),
      {
        now: () => NOW,
      }
    )

    const result = await worker.executeBatch('worker-1')

    assert.equal(result.processed, 0)
    assert.equal(result.leaseLost, 1)
  })

  test('uses the same source lease for immediate post-report processing', async ({ assert }) => {
    const repository = new FakeIntentRepository([job()], true)
    const worker = new ProcessAiDisputeAutoQueueIntentsCommand(
      repository,
      () => Promise.resolve(),
      {
        now: () => NOW,
      }
    )

    const result = await worker.executeSource('review_dispute', job().sourceId, 'request-worker')

    assert.equal(result.claimed, 1)
    assert.equal(result.processed, 1)
    assert.lengthOf(repository.claimInputs, 0)
    assert.lengthOf(repository.acknowledged, 1)
  })

  test('does not claim work after shutdown has started', async ({ assert }) => {
    const repository = new FakeIntentRepository([job()], true)
    const controller = new AbortController()
    controller.abort()
    let processorCalls = 0
    const worker = new ProcessAiDisputeAutoQueueIntentsCommand(repository, () => {
      processorCalls += 1
      return Promise.resolve()
    })

    const result = await worker.executeBatch('stopping-worker', controller.signal)

    assert.deepEqual(result, {
      claimed: 0,
      processed: 0,
      retried: 0,
      deadLettered: 0,
      leaseLost: 0,
      shutdownDeferred: 0,
    })
    assert.equal(processorCalls, 0)
    assert.lengthOf(repository.claimInputs, 0)
  })

  test('leaves claimed leases untouched when shutdown begins during processing', async ({
    assert,
  }) => {
    const secondJob = {
      ...job(),
      id: '10000000-0000-4000-8000-000000000002',
      sourceId: '20000000-0000-4000-8000-000000000002',
      leaseToken: '40000000-0000-4000-8000-000000000002',
    }
    const repository = new FakeIntentRepository([job(), secondJob], true)
    const controller = new AbortController()
    let processorCalls = 0
    const worker = new ProcessAiDisputeAutoQueueIntentsCommand(repository, () => {
      processorCalls += 1
      controller.abort()
      return Promise.resolve()
    })

    const result = await worker.executeBatch('stopping-worker', controller.signal)

    assert.equal(result.claimed, 2)
    assert.equal(result.shutdownDeferred, 2)
    assert.equal(result.processed, 0)
    assert.equal(result.retried, 0)
    assert.equal(result.deadLettered, 0)
    assert.equal(processorCalls, 1)
    assert.equal(repository.hasEvaluationCalls, 0)
    assert.lengthOf(repository.acknowledged, 0)
    assert.lengthOf(repository.failures, 0)
  })

  test('caps retry delay', ({ assert }) => {
    assert.equal(
      calculateAiDisputeAutoQueueRetryAt(NOW, 20, 1_000, 10_000).toISOString(),
      '2026-07-23T12:00:10.000Z'
    )
  })
})
