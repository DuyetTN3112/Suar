import { test } from '@japa/runner'
import SingleFlightService from '#services/single_flight_service'

test.group('SingleFlightService', (group) => {
  // Clear all in-flight requests before each test
  group.each.setup(() => {
    SingleFlightService.clear()
  })

  test('should execute callback only once for concurrent requests with same key', async ({
    assert,
  }) => {
    let executionCount = 0

    // Function that simulates an expensive operation
    const expensiveOperation = async () => {
      executionCount++
      // Simulate some async work
      await new Promise((resolve) => setTimeout(resolve, 10))
      return `result-${executionCount}`
    }

    // Execute multiple requests concurrently with the same key
    const results = await Promise.all([
      SingleFlightService.execute('test-key', expensiveOperation),
      SingleFlightService.execute('test-key', expensiveOperation),
      SingleFlightService.execute('test-key', expensiveOperation),
    ])

    // All requests should return the same result
    assert.equal(results[0], 'result-1')
    assert.equal(results[1], 'result-1')
    assert.equal(results[2], 'result-1')

    // The expensive operation should only be executed once
    assert.equal(executionCount, 1)
  })

  test('should execute callback for different keys', async ({ assert }) => {
    let executionCount = 0

    // Function that simulates an expensive operation
    const expensiveOperation = async () => {
      executionCount++
      // Simulate some async work
      await new Promise((resolve) => setTimeout(resolve, 10))
      return `result-${executionCount}`
    }

    // Execute requests with different keys
    const result1 = await SingleFlightService.execute('key-1', expensiveOperation)
    const result2 = await SingleFlightService.execute('key-2', expensiveOperation)

    // Each request should return different results
    assert.equal(result1, 'result-1')
    assert.equal(result2, 'result-2')

    // The expensive operation should be executed for each key
    assert.equal(executionCount, 2)
  })

  test('should handle errors correctly', async ({ assert }) => {
    let executionCount = 0

    // Function that simulates an operation that throws an error
    const failingOperation = async () => {
      executionCount++
      throw new Error('Operation failed')
    }

    // Execute multiple requests concurrently with the same key
    const promises = [
      SingleFlightService.execute('error-key', failingOperation).catch((err) => err.message),
      SingleFlightService.execute('error-key', failingOperation).catch((err) => err.message),
      SingleFlightService.execute('error-key', failingOperation).catch((err) => err.message),
    ]

    const results = await Promise.all(promises)

    // All requests should receive the same error
    assert.equal(results[0], 'Operation failed')
    assert.equal(results[1], 'Operation failed')
    assert.equal(results[2], 'Operation failed')

    // The failing operation should only be executed once
    assert.equal(executionCount, 1)
  })

  test('should correctly report in-flight status', async ({ assert }) => {
    // Function that simulates a long-running operation
    const longRunningOperation = async () => {
      await new Promise((resolve) => setTimeout(resolve, 50))
      return 'completed'
    }

    // Check initial state
    assert.isFalse(SingleFlightService.isInFlight('long-key'))
    assert.equal(SingleFlightService.getInFlightCount(), 0)

    // Start the operation
    const promise = SingleFlightService.execute('long-key', longRunningOperation)

    // Check during execution
    assert.isTrue(SingleFlightService.isInFlight('long-key'))
    assert.equal(SingleFlightService.getInFlightCount(), 1)

    // Wait for completion
    await promise

    // Check after completion
    assert.isFalse(SingleFlightService.isInFlight('long-key'))
    assert.equal(SingleFlightService.getInFlightCount(), 0)
  })
})
