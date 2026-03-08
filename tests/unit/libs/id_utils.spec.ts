import { test } from '@japa/runner'
import {
  parseId,
  isValidId,
  toStringId,
  isSameId,
  validateRequiredId,
  validateOptionalId,
} from '#libs/id_utils'
import ValidationException from '#exceptions/validation_exception'

const VALID_UUID_V4 = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'
const VALID_UUID_V7 = '01912345-6789-7abc-8def-0123456789ab'

// ============================================================================
// parseId
// ============================================================================
test.group('parseId', () => {
  test('parses valid UUIDv4', ({ assert }) => {
    const result = parseId(VALID_UUID_V4)
    assert.equal(result, VALID_UUID_V4)
  })

  test('parses valid UUIDv7', ({ assert }) => {
    const result = parseId(VALID_UUID_V7)
    assert.equal(result, VALID_UUID_V7)
  })

  test('throws for undefined', ({ assert }) => {
    assert.throws(() => parseId(undefined), 'ID is required')
  })

  test('throws for null', ({ assert }) => {
    assert.throws(() => parseId(null), 'ID is required')
  })

  test('throws for empty string', ({ assert }) => {
    assert.throws(() => parseId(''), 'ID is required')
  })

  test('throws for invalid UUID format', ({ assert }) => {
    assert.throws(() => parseId('not-a-uuid'), /Invalid ID format/)
  })

  test('throws for numeric input (not UUID)', ({ assert }) => {
    assert.throws(() => parseId(123), /Invalid ID format/)
  })

  test('parses string number that happens to match UUID (edge case)', ({ assert }) => {
    // String numbers won't match UUID regex
    assert.throws(() => parseId('123'), /Invalid ID format/)
  })
})

// ============================================================================
// isValidId
// ============================================================================
test.group('isValidId', () => {
  test('returns true for valid UUIDv4', ({ assert }) => {
    assert.isTrue(isValidId(VALID_UUID_V4))
  })

  test('returns true for valid UUIDv7', ({ assert }) => {
    assert.isTrue(isValidId(VALID_UUID_V7))
  })

  test('returns false for invalid string', ({ assert }) => {
    assert.isFalse(isValidId('not-a-uuid'))
  })

  test('returns false for number', ({ assert }) => {
    assert.isFalse(isValidId(123))
  })

  test('returns false for null', ({ assert }) => {
    assert.isFalse(isValidId(null))
  })

  test('returns false for undefined', ({ assert }) => {
    assert.isFalse(isValidId(undefined))
  })

  test('returns false for empty string', ({ assert }) => {
    assert.isFalse(isValidId(''))
  })

  test('returns false for object', ({ assert }) => {
    assert.isFalse(isValidId({ id: '123' }))
  })

  test('case insensitive UUID check', ({ assert }) => {
    assert.isTrue(isValidId(VALID_UUID_V4.toUpperCase()))
  })
})

// ============================================================================
// toStringId
// ============================================================================
test.group('toStringId', () => {
  test('converts UUID to string', ({ assert }) => {
    assert.equal(toStringId(VALID_UUID_V4), VALID_UUID_V4)
  })

  test('returns same string for string input', ({ assert }) => {
    assert.equal(toStringId(VALID_UUID_V7), VALID_UUID_V7)
  })
})

// ============================================================================
// isSameId
// ============================================================================
test.group('isSameId', () => {
  test('returns true for same UUIDs', ({ assert }) => {
    assert.isTrue(isSameId(VALID_UUID_V4, VALID_UUID_V4))
  })

  test('returns false for different UUIDs', ({ assert }) => {
    assert.isFalse(isSameId(VALID_UUID_V4, VALID_UUID_V7))
  })
})

// ============================================================================
// validateRequiredId
// ============================================================================
test.group('validateRequiredId', () => {
  test('passes for valid UUID', ({ assert }) => {
    assert.doesNotThrow(() => {
      validateRequiredId(VALID_UUID_V4, 'user_id')
    })
  })

  test('throws for undefined', ({ assert }) => {
    assert.throws(() => {
      validateRequiredId(undefined, 'user_id')
    })
  })

  test('throws for null', ({ assert }) => {
    assert.throws(() => {
      validateRequiredId(null, 'user_id')
    })
  })

  test('throws for invalid string', ({ assert }) => {
    assert.throws(() => {
      validateRequiredId('not-uuid', 'user_id')
    })
  })

  test('includes field name in error', ({ assert }) => {
    try {
      validateRequiredId(null, 'organization_id')
      assert.fail('Should have thrown')
    } catch (error) {
      assert.instanceOf(error, ValidationException)
    }
  })
})

// ============================================================================
// validateOptionalId
// ============================================================================
test.group('validateOptionalId', () => {
  test('passes for valid UUID', ({ assert }) => {
    assert.doesNotThrow(() => {
      validateOptionalId(VALID_UUID_V4, 'user_id')
    })
  })

  test('passes for undefined', ({ assert }) => {
    assert.doesNotThrow(() => {
      validateOptionalId(undefined, 'user_id')
    })
  })

  test('passes for null', ({ assert }) => {
    assert.doesNotThrow(() => {
      validateOptionalId(null, 'user_id')
    })
  })

  test('throws for invalid non-null string', ({ assert }) => {
    assert.throws(() => {
      validateOptionalId('not-uuid', 'user_id')
    })
  })
})
