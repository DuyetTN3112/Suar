import { test } from '@japa/runner'

import {
  CACHE_SINGLE_FLIGHT_DEFAULT_WAIT_MS,
  resolveCacheSingleFlightPolicy,
} from '#modules/cache/domain/cache_single_flight_policy'

test.group('Cache single-flight policy', () => {
  test('provides a bounded heartbeat lease for the default waiter budget', ({ assert }) => {
    assert.deepEqual(resolveCacheSingleFlightPolicy(), {
      waitTimeoutMs: CACHE_SINGLE_FLIGHT_DEFAULT_WAIT_MS,
      lockTtlMs: 2_000,
      heartbeatIntervalMs: 500,
      maxLeaseLifetimeMs: 7_000,
    })
  })

  test('accepts a namespace-specific wait budget without allowing an unbounded lease', ({
    assert,
  }) => {
    assert.deepEqual(resolveCacheSingleFlightPolicy({ waitTimeoutMs: 12_000 }), {
      waitTimeoutMs: 12_000,
      lockTtlMs: 2_000,
      heartbeatIntervalMs: 500,
      maxLeaseLifetimeMs: 14_000,
    })
  })

  test('rejects malformed, too-short, and unbounded waiter budgets', ({ assert }) => {
    for (const waitTimeoutMs of [0, 99, 1.5, 30_001, Number.NaN]) {
      assert.throws(
        () => resolveCacheSingleFlightPolicy({ waitTimeoutMs }),
        /integer between 100 and 30000/
      )
    }
  })
})
