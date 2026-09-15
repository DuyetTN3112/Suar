import { test } from '@japa/runner'

import { mapValidationIssues } from '#modules/http/boundary/validation_error_mapper'

test.group('Validation error mapper', () => {
  test('preserves indexed paths and issue codes in canonical violations', ({ assert }) => {
    const mapped = mapValidationIssues([
      { path: 'items.0.name', message: 'Name is required', code: 'NAME_REQUIRED' },
      { path: 'items.0.name', message: 'Ignored duplicate', code: 'NAME_DUPLICATE' },
    ])

    assert.deepEqual(mapped.errors, { 'items.0.name': 'Name is required' })
    assert.deepEqual(mapped.violations, [
      {
        field: 'items.0.name',
        pointer: '/items/0/name',
        message: 'Name is required',
        code: 'NAME_REQUIRED',
      },
      {
        field: 'items.0.name',
        pointer: '/items/0/name',
        message: 'Ignored duplicate',
        code: 'NAME_DUPLICATE',
      },
    ])
  })
})
