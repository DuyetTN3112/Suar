import { test } from '@japa/runner'

import {
  pollAiDisputeEvaluation,
  type AiDisputeEvaluationStatusRow,
} from '#modules/reviews/infra/adapters/disputes/ai_dispute_evaluation_polling'

test.group('AI dispute evaluation polling', () => {
  test('polls sequentially and returns the completed row', async ({ assert }) => {
    const controller = new AbortController()
    let concurrentLoads = 0
    let maximumConcurrentLoads = 0
    const rows: AiDisputeEvaluationStatusRow[] = [
      { status: 'processing' },
      { status: 'completed', recommendation: 'accept' },
    ]

    const result = await pollAiDisputeEvaluation({
      signal: controller.signal,
      intervalMilliseconds: 10,
      timeoutMilliseconds: 30,
      wait: async () => {},
      async load() {
        concurrentLoads += 1
        maximumConcurrentLoads = Math.max(maximumConcurrentLoads, concurrentLoads)
        const row = rows.shift() ?? null
        await Promise.resolve()
        concurrentLoads -= 1
        return row
      },
    })

    assert.equal(result.kind, 'completed')
    assert.equal(result.elapsedSeconds, 0.02)
    assert.equal(maximumConcurrentLoads, 1)
  })

  test('propagates datastore failures instead of creating an unhandled callback rejection', async ({
    assert,
  }) => {
    const failure = new Error('database unavailable')

    await assert.rejects(
      () =>
        pollAiDisputeEvaluation({
          signal: new AbortController().signal,
          intervalMilliseconds: 10,
          timeoutMilliseconds: 20,
          wait: async () => {},
          load: () => Promise.reject(failure),
        }),
      /database unavailable/
    )
  })

  test('returns aborted without loading after an interrupted wait', async ({ assert }) => {
    const controller = new AbortController()
    let loadCalls = 0

    const result = await pollAiDisputeEvaluation({
      signal: controller.signal,
      intervalMilliseconds: 10,
      timeoutMilliseconds: 20,
      wait: () => {
        controller.abort()
        return Promise.resolve()
      },
      load: () => {
        loadCalls += 1
        return Promise.resolve({ status: 'processing' })
      },
    })

    assert.equal(result.kind, 'aborted')
    assert.equal(loadCalls, 0)
  })

  test('distinguishes missing, failed, and timed-out terminal states', async ({ assert }) => {
    const base = {
      signal: new AbortController().signal,
      intervalMilliseconds: 10,
      timeoutMilliseconds: 10,
      wait: async () => {},
    }

    const missing = await pollAiDisputeEvaluation({
      ...base,
      load: () => Promise.resolve(null),
    })
    const failed = await pollAiDisputeEvaluation({
      ...base,
      load: () => Promise.resolve({ status: 'failed' }),
    })
    const timedOut = await pollAiDisputeEvaluation({
      ...base,
      load: () => Promise.resolve({ status: 'processing' }),
    })

    assert.equal(missing.kind, 'missing')
    assert.equal(failed.kind, 'failed')
    assert.equal(timedOut.kind, 'timed_out')
  })
})
