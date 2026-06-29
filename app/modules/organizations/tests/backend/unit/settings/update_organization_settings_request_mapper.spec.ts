import { test } from '@japa/runner'

import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { buildUpdateOrganizationSettingsInput } from '#modules/organizations/controllers/mappers/request/settings/update_organization_settings_request_mapper'

test.group('Update organization settings request mapper', () => {
  test('trims supported optional settings fields', ({ assert }) => {
    assert.deepEqual(
      buildUpdateOrganizationSettingsInput({ name: '  Suar  ', description: '', website: null }),
      { name: 'Suar' }
    )
  })

  test('rejects wrong field types with canonical paths', ({ assert }) => {
    try {
      buildUpdateOrganizationSettingsInput({ name: 42, website: false })
      assert.fail('Expected invalid organization settings to be rejected')
    } catch (error) {
      assert.instanceOf(error, ValidationException)
      assert.deepEqual((error as ValidationException).issues.map((issue) => issue.path), [
        'name',
        'website',
      ])
    }
  })
})
