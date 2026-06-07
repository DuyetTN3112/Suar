import { test } from '@japa/runner'

import ValidationException from '#modules/errors/public_contracts/validation_exception'
import {
  buildCreateSavedFilterViewRequest,
  buildShareSavedFilterViewRequest,
  buildUpdateFilterAlertRequest,
  buildUpdateSavedFilterViewRequest,
} from '#modules/filtering/controllers/mappers/request/saved-filter-views/filter_saved_view_request_mapper'

const criteria = {
  context: 'admin.audit_logs',
  schemaVersion: 1,
  sort: [{ field: 'createdAt', direction: 'desc' }],
}


test.group('', () => {
  test('maps create and update request bodies without raw transport aliases', ({ assert }) => {
    assert.equal(buildCreateSavedFilterViewRequest({ name: 'Audit', contextKey: 'admin.audit_logs', contextOwner: 'admin', criteria }).name, 'Audit')
    assert.equal(buildUpdateSavedFilterViewRequest({ expectedLockVersion: 2, criteria }).expectedLockVersion, 2)
  })

  test('maps alert action and validates grant shape at the request boundary', ({ assert }) => {
    assert.deepEqual(buildUpdateFilterAlertRequest({ action: 'pause', expectedLockVersion: 1 }), {
      expectedLockVersion: 1,
      action: 'pause',
    })
    try {
      buildShareSavedFilterViewRequest({ expectedLockVersion: 1, grants: [{ target: { type: 'unknown', id: '' }, read: 'yes' }] })
      assert.fail('Expected malformed grant to be rejected')
    } catch (error) {
      assert.instanceOf(error, ValidationException)
      assert.deepEqual((error as ValidationException).issues.map((issue) => issue.path), [
        'grants.0.target.type',
        'grants.0.target.id',
        'grants.0.read',
      ])
    }
  })

})
