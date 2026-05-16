import { test } from '@japa/runner'

import {
  CACHE_DEPENDENCY_LOG_DEFAULT_INTERVAL_MS,
  CacheDependencyLogGate,
  resolveCacheDependencyLogIntervalMs,
} from '#modules/cache/domain/cache-runtime/cache_dependency_log_policy'

test.group('Cache dependency log policy', () => {
  test('validates a bounded enterprise log interval', ({ assert }) => {
    assert.equal(
      resolveCacheDependencyLogIntervalMs(undefined),
      CACHE_DEPENDENCY_LOG_DEFAULT_INTERVAL_MS
    )
    assert.equal(resolveCacheDependencyLogIntervalMs('1000'), 1_000)
    assert.equal(resolveCacheDependencyLogIntervalMs('300000'), 300_000)

    for (const value of ['999', '300001', '1.5', 'NaN']) {
      assert.throws(() => resolveCacheDependencyLogIntervalMs(value), /between 1000 and 300000/)
    }
  })

  test('emits the first failure, bounds repeats, and reports recovery', ({ assert }) => {
    let observedAt = 10_000
    const gate = new CacheDependencyLogGate(1_000, () => observedAt)

    assert.deepEqual(gate.recordFailure('read'), { emit: true, suppressedFailures: 0 })
    assert.deepEqual(gate.recordFailure('read'), { emit: false, suppressedFailures: 0 })
    assert.deepEqual(gate.recordFailure('read'), { emit: false, suppressedFailures: 0 })

    observedAt += 1_000
    assert.deepEqual(gate.recordFailure('read'), { emit: true, suppressedFailures: 2 })
    assert.deepEqual(gate.recordFailure('read'), { emit: false, suppressedFailures: 0 })

    observedAt += 250
    assert.deepEqual(gate.recordSuccess('read'), {
      outageDurationMs: 1_250,
      totalFailures: 5,
      suppressedFailures: 1,
    })
    assert.isNull(gate.recordSuccess('read'))
  })

  test('keeps failure channels isolated', ({ assert }) => {
    const gate = new CacheDependencyLogGate(1_000, () => 10_000)

    assert.isTrue(gate.recordFailure('read').emit)
    assert.isTrue(gate.recordFailure('write').emit)
    assert.isFalse(gate.recordFailure('read').emit)
    assert.deepEqual(gate.recordSuccess('write'), {
      outageDurationMs: 0,
      totalFailures: 1,
      suppressedFailures: 0,
    })
    assert.isNull(gate.recordSuccess('generation'))
  })
})
