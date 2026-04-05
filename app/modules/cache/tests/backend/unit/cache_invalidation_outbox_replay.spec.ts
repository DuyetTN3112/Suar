import { randomUUID } from 'node:crypto'

import { test } from '@japa/runner'

import {
  normalizeCacheInvalidationReplayRequest,
  normalizeCacheInvalidationReplaySelector,
} from '#modules/cache/domain/cache_invalidation_outbox'

test.group('Cache invalidation outbox replay guardrails', () => {
  test('normalizes a bounded UUID selector and operator reason', ({ assert }) => {
    const first = randomUUID()
    const second = randomUUID()

    const result = normalizeCacheInvalidationReplayRequest(
      {
        ids: [first.toUpperCase(), first, second],
        errorClass: ' RedisTimeoutError ',
      },
      '  Redis recovered; replay the reviewed invalidations.  '
    )

    assert.deepEqual(result.selector, {
      ids: [first, second],
      errorClass: 'RedisTimeoutError',
    })
    assert.equal(result.reason, 'Redis recovered; replay the reviewed invalidations.')
  })

  test('accepts only an ordered sequence window of at most 100 positions', ({ assert }) => {
    assert.deepEqual(
      normalizeCacheInvalidationReplaySelector({
        fromSequence: 101,
        toSequence: 200,
      }),
      {
        fromSequence: 101,
        toSequence: 200,
      }
    )

    assert.throws(
      () =>
        normalizeCacheInvalidationReplaySelector({
          fromSequence: 101,
          toSequence: 201,
        }),
      /at most 100/
    )
    assert.throws(
      () => normalizeCacheInvalidationReplaySelector({ fromSequence: 101 }),
      /requires both/
    )
  })

  test('rejects unbounded, malformed, or oversized selectors', ({ assert }) => {
    assert.throws(() => normalizeCacheInvalidationReplaySelector({}), /explicit ids/)
    assert.throws(
      () => normalizeCacheInvalidationReplaySelector({ errorClass: 'RedisTimeoutError' }),
      /explicit ids/
    )
    assert.throws(
      () => normalizeCacheInvalidationReplaySelector({ ids: ['not-a-uuid'] }),
      /valid UUIDs/
    )
    assert.throws(
      () =>
        normalizeCacheInvalidationReplaySelector({
          ids: Array.from({ length: 101 }, () => randomUUID()),
        }),
      /between 1 and 100/
    )
    assert.throws(
      () =>
        normalizeCacheInvalidationReplaySelector({
          ids: [randomUUID()],
          errorClass: 'unsafe error class',
        }),
      /safe characters/
    )
  })

  test('requires a meaningful bounded operator reason', ({ assert }) => {
    const selector = { ids: [randomUUID()] }

    assert.throws(() => normalizeCacheInvalidationReplayRequest(selector, 'too short'), /10 to 500/)
    assert.throws(
      () => normalizeCacheInvalidationReplayRequest(selector, 'x'.repeat(501)),
      /10 to 500/
    )
  })
})
