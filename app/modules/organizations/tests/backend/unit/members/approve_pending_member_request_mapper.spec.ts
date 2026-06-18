import { test } from '@japa/runner'

import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { buildApprovePendingMemberRequest } from '#modules/organizations/controllers/mappers/request/members/approve_pending_member_request_mapper'

test.group('Approve pending member request mapper', () => {
  test('trims the pending member route id', ({ assert }) => {
    assert.deepEqual(buildApprovePendingMemberRequest({ userId: ' user-1 ' }), { userId: 'user-1' })
  })

  test('rejects missing and non-string route ids', ({ assert }) => {
    assert.throws(() => buildApprovePendingMemberRequest({}), ValidationException)
    assert.throws(() => buildApprovePendingMemberRequest({ userId: 42 }), ValidationException)
  })
})
