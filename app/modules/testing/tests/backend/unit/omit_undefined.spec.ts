import { test } from '@japa/runner'

import { omitUndefined } from '#modules/contracts/public_contracts/optional_payload'

test.group('omitUndefined', () => {
  test('drops undefined keys while preserving required values and nulls', ({ assert }) => {
    const value = omitUndefined({
      page: 1,
      search: undefined as string | undefined,
      status: 'active',
      deletedAt: null as string | null | undefined,
    })

    assert.deepEqual(value, {
      page: 1,
      status: 'active',
      deletedAt: null,
    })
    assert.notProperty(value, 'search')
  })
})
