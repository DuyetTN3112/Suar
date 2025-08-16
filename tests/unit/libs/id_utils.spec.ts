import { test } from '@japa/runner'

import {
  parseId,
  isValidId,
  toStringId,
  isSameId,
  validateRequiredId,
  validateOptionalId,
} from '#libs/id_utils'

const UUID_V4 = '550e8400-e29b-41d4-a716-446655440000'
const UUID_V7 = '0195d8f0-0d1b-7fd0-9df3-b0f3d0e0ac79'

test.group('ID utils', () => {
  test('UUID helpers accept canonical v4 and v7 identifiers across parse and validate flows', ({
    assert,
  }) => {
    assert.equal(parseId(UUID_V4), UUID_V4)
    assert.equal(parseId(UUID_V7), UUID_V7)
    assert.isTrue(isValidId(UUID_V4))
    assert.isTrue(isValidId(UUID_V7.toUpperCase()))
    assert.doesNotThrow(() => {
      validateRequiredId(UUID_V7, 'organization_id')
    })
    assert.doesNotThrow(() => {
      validateOptionalId(UUID_V4, 'project_id')
    })
  })

  test('malformed or missing identifiers are rejected consistently across parse and validate helpers', ({
    assert,
  }) => {
    for (const value of [undefined, null, '', '123', 'not-a-uuid']) {
      assert.throws(() => parseId(value))
    }
    assert.isFalse(isValidId('invalid'))
    assert.isFalse(isValidId(42))
    assert.isFalse(isValidId(null))
    assert.throws(() => {
      validateRequiredId(undefined, 'organization_id')
    })
    assert.throws(() => {
      validateRequiredId('invalid', 'organization_id')
    })
    assert.doesNotThrow(() => {
      validateOptionalId(undefined, 'project_id')
    })
    assert.doesNotThrow(() => {
      validateOptionalId(null, 'project_id')
    })
    assert.doesNotThrow(() => {
      validateOptionalId(UUID_V4, 'project_id')
    })
    assert.throws(() => {
      validateOptionalId('invalid', 'project_id')
    })
  })

  test('identity helpers preserve string serialization and equality semantics', ({ assert }) => {
    assert.equal(toStringId(UUID_V7), UUID_V7)
    assert.isTrue(isSameId(UUID_V7, UUID_V7))
    assert.isFalse(isSameId(UUID_V7, UUID_V4))
  })
})
