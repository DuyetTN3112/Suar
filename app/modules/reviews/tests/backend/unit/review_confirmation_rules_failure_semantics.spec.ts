import { test } from '@japa/runner'

import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import {
  latestRevieweeConfirmationAction,
  parseReviewConfirmations,
} from '#modules/reviews/domain/review_confirmation_rules'

test.group('Review confirmation persistence failure semantics', () => {
  test('preserves valid persisted confirmations and selects the latest reviewee action', ({
    assert,
  }) => {
    const confirmations = JSON.stringify([
      {
        user_id: 'reviewee-1',
        action: 'confirmed',
        created_at: '2026-07-01T10:00:00.000Z',
      },
      {
        user_id: 'reviewee-1',
        action: 'disputed',
        created_at: '2026-07-02T10:00:00.000Z',
      },
    ])

    assert.equal(latestRevieweeConfirmationAction(confirmations, 'reviewee-1'), 'disputed')
    assert.lengthOf(parseReviewConfirmations(confirmations), 2)
  })

  test('orders valid timestamps by instant rather than their textual timezone form', ({
    assert,
  }) => {
    const confirmations = [
      {
        user_id: 'reviewee-1',
        action: 'disputed',
        created_at: '2026-07-02T00:30:00+02:00',
      },
      {
        user_id: 'reviewee-1',
        action: 'confirmed',
        created_at: '2026-07-01T23:00:00Z',
      },
    ]

    assert.equal(latestRevieweeConfirmationAction(confirmations, 'reviewee-1'), 'confirmed')
  })

  test('treats an absent legacy value as no confirmations', ({ assert }) => {
    assert.deepEqual(parseReviewConfirmations(null), [])
    assert.isNull(latestRevieweeConfirmationAction(undefined, 'reviewee-1'))
  })

  test('fails closed when persisted confirmation JSON is malformed', ({ assert }) => {
    assert.throws(
      () => parseReviewConfirmations('[{"user_id":'),
      InvariantViolationException
    )
  })

  test('fails closed instead of partially accepting malformed confirmation entries', ({
    assert,
  }) => {
    assert.throws(
      () =>
        parseReviewConfirmations([
          {
            user_id: 'reviewee-1',
            action: 'confirmed',
            created_at: 'not-a-timestamp',
          },
        ]),
      InvariantViolationException
    )
    assert.throws(() => parseReviewConfirmations({}), InvariantViolationException)
  })
})
