import { test } from '@japa/runner'

import { toErrorEventUuidOrNull } from '#modules/errors/domain/error_event_identifier'

test.group('Error event identifier policy', () => {
  test('keeps UUID identifiers and drops unsafe correlation values', ({ assert }) => {
    const uuid = '550e8400-e29b-41d4-a716-446655440000'

    assert.equal(toErrorEventUuidOrNull(uuid), uuid)
    assert.isNull(toErrorEventUuidOrNull('request-123'))
    assert.isNull(toErrorEventUuidOrNull(''))
    assert.isNull(toErrorEventUuidOrNull(null))
  })
})
