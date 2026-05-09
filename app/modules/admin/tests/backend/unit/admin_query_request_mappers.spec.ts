import { test } from '@japa/runner'

import ValidationException from '#modules/errors/public_contracts/validation_exception'
import {
  buildAdminDisputeDetailRequest,
  buildAdminDisputeListRequest,
} from '#modules/admin/disputes/controllers/mappers/request/disputes/admin_dispute_list_request_mapper'
import { buildFlaggedReviewListRequest } from '#modules/admin/reviews/controllers/mappers/request/reviews/flagged_review_list_request_mapper'
import { buildAdminUserListRequest } from '#modules/admin/users/controllers/mappers/request/users/admin_user_list_request_mapper'

function request(values: Record<string, unknown>) {
  return {
    input(key: string, fallback?: unknown) {
      return Object.hasOwn(values, key) ? values[key] : fallback
    },
  }
}

test.group('Admin query request mappers', () => {
  test('rejects non-string admin dispute filters instead of passing them to the query', ({ assert }) => {
    assert.throws(
      () => buildAdminDisputeListRequest(request({ status: { value: 'pending' } })),
      ValidationException
    )
  })

  test('preserves admin dispute cursor and pagination aliases for valid input', ({ assert }) => {
    assert.deepEqual(
      buildAdminDisputeListRequest(
        request({ after: 'cursor-1', page: '4', perPage: '25', status: 'pending' })
      ),
      {
        page: 1,
        perPage: 25,
        after: 'cursor-1',
        before: null,
        status: 'pending',
        search: null,
        requestedOutcome: null,
        finalDecision: null,
      }
    )
  })

  test('rejects invalid flagged-review enum filters', ({ assert }) => {
    assert.throws(
      () => buildFlaggedReviewListRequest(request({ severity: 'urgent' })),
      ValidationException
    )
  })

  test('rejects wrong-type admin user query containers and filters', ({ assert }) => {
    assert.throws(() => buildAdminUserListRequest([]), ValidationException)
    assert.throws(
      () => buildAdminUserListRequest({ system_role: ['system_admin'] }),
      ValidationException
    )
  })

  test('rejects malformed admin dispute route ids', ({ assert }) => {
    assert.deepEqual(buildAdminDisputeDetailRequest({ disputeId: ' dispute-1 ' }), { disputeId: 'dispute-1' })
    assert.throws(() => buildAdminDisputeDetailRequest({ disputeId: 42 }), ValidationException)
  })
})
