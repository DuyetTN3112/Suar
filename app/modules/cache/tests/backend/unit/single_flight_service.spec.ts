import { test } from '@japa/runner'

import * as InProcessSingleFlightExecutor from '#modules/cache/infra/adapters/cache-runtime/in_process_single_flight_executor'

test.group('InProcessSingleFlightExecutor', (group) => {
  group.each.setup(() => {
    InProcessSingleFlightExecutor.clear()
  })

  test('executes the callback only once for concurrent requests sharing a key', async ({
    assert,
  }) => {
    let executionCount = 0

    const expensiveOperation = async () => {
      executionCount++
      await new Promise((resolve) => setTimeout(resolve, 10))
      return `result-${executionCount}`
    }

    const results = await Promise.all([
      InProcessSingleFlightExecutor.execute('test-key', expensiveOperation),
      InProcessSingleFlightExecutor.execute('test-key', expensiveOperation),
      InProcessSingleFlightExecutor.execute('test-key', expensiveOperation),
    ])

    assert.equal(results[0], 'result-1')
    assert.equal(results[1], 'result-1')
    assert.equal(results[2], 'result-1')
    assert.equal(executionCount, 1)
  })

  test('keeps different keys isolated while accurately reporting in-flight state', async ({
    assert,
  }) => {
    let executionCount = 0

    const expensiveOperation = async () => {
      executionCount++
      await new Promise((resolve) => setTimeout(resolve, 10))
      return `result-${executionCount}`
    }

    const longRunningOperation = async () => {
      await new Promise((resolve) => setTimeout(resolve, 50))
      return 'completed'
    }

    assert.isFalse(InProcessSingleFlightExecutor.isInFlight('long-key'))
    assert.equal(InProcessSingleFlightExecutor.getInFlightCount(), 0)

    const promise = InProcessSingleFlightExecutor.execute('long-key', longRunningOperation)

    assert.isTrue(InProcessSingleFlightExecutor.isInFlight('long-key'))
    assert.equal(InProcessSingleFlightExecutor.getInFlightCount(), 1)

    const [result1, result2] = await Promise.all([
      InProcessSingleFlightExecutor.execute('key-1', expensiveOperation),
      InProcessSingleFlightExecutor.execute('key-2', expensiveOperation),
    ])

    assert.match(result1, /^result-\d+$/)
    assert.match(result2, /^result-\d+$/)
    assert.equal(executionCount, 2)

    await promise

    assert.isFalse(InProcessSingleFlightExecutor.isInFlight('long-key'))
    assert.equal(InProcessSingleFlightExecutor.getInFlightCount(), 0)
  })

  test('shares a single failure for concurrent callers and clears the key afterward', async ({
    assert,
  }) => {
    let executionCount = 0

    const failingOperation = () => {
      executionCount++
      return Promise.reject(new Error('Operation failed'))
    }

    const results = await Promise.all([
      InProcessSingleFlightExecutor.execute('error-key', failingOperation).catch((err: unknown) =>
        err instanceof Error ? err.message : String(err)
      ),
      InProcessSingleFlightExecutor.execute('error-key', failingOperation).catch((err: unknown) =>
        err instanceof Error ? err.message : String(err)
      ),
      InProcessSingleFlightExecutor.execute('error-key', failingOperation).catch((err: unknown) =>
        err instanceof Error ? err.message : String(err)
      ),
    ])

    assert.equal(results[0], 'Operation failed')
    assert.equal(results[1], 'Operation failed')
    assert.equal(results[2], 'Operation failed')
    assert.equal(executionCount, 1)
    assert.isFalse(InProcessSingleFlightExecutor.isInFlight('error-key'))
  })
})
