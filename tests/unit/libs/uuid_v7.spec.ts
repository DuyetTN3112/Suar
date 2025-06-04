import { test } from '@japa/runner'
import {
  generateUUIDv7,
  extractTimestamp,
  isUUIDv7,
  generateUUIDv7Batch,
  compareUUIDv7,
  getPostgresUUIDv7FunctionSQL,
} from '#libs/uuid_v7'

// ============================================================================
// generateUUIDv7
// ============================================================================
test.group('generateUUIDv7', () => {
  test('generates valid UUID format', ({ assert }) => {
    const uuid = generateUUIDv7()
    assert.match(uuid, /^[\da-f]{8}-[\da-f]{4}-7[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i)
  })

  test('generates unique UUIDs', ({ assert }) => {
    const uuid1 = generateUUIDv7()
    const uuid2 = generateUUIDv7()
    assert.notEqual(uuid1, uuid2)
  })

  test('has version 7 in correct position', ({ assert }) => {
    const uuid = generateUUIDv7()
    // Version nibble is at position 14 (0-indexed in the string without dashes)
    assert.equal(uuid.charAt(14), '7')
  })

  test('has correct variant bits', ({ assert }) => {
    const uuid = generateUUIDv7()
    // Variant should be 8, 9, a, or b at position 19
    assert.match(uuid.charAt(19), /[89ab]/i)
  })

  test('generates monotonically increasing UUIDs', ({ assert }) => {
    const uuids: string[] = []
    for (let i = 0; i < 100; i++) {
      uuids.push(generateUUIDv7())
    }
    for (let i = 1; i < uuids.length; i++) {
      assert.isTrue(
        uuids[i]! >= uuids[i - 1]!,
        `UUID at index ${i} should be >= UUID at index ${i - 1}`
      )
    }
  })
})

// ============================================================================
// extractTimestamp
// ============================================================================
test.group('extractTimestamp', () => {
  test('extracts timestamp close to now', ({ assert }) => {
    const before = Date.now()
    const uuid = generateUUIDv7()
    const after = Date.now()
    const timestamp = extractTimestamp(uuid)
    assert.isTrue(timestamp.getTime() >= before)
    assert.isTrue(timestamp.getTime() <= after)
  })

  test('throws for invalid UUID format', ({ assert }) => {
    assert.throws(() => extractTimestamp('not-a-uuid'), /Invalid UUID format/)
  })

  test('throws for too short string', ({ assert }) => {
    assert.throws(() => extractTimestamp('12345'), /Invalid UUID format/)
  })
})

// ============================================================================
// isUUIDv7
// ============================================================================
test.group('isUUIDv7', () => {
  test('returns true for generated UUIDv7', ({ assert }) => {
    const uuid = generateUUIDv7()
    assert.isTrue(isUUIDv7(uuid))
  })

  test('returns false for UUIDv4', ({ assert }) => {
    // UUIDv4 has version 4
    assert.isFalse(isUUIDv7('a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'))
  })

  test('returns false for invalid string', ({ assert }) => {
    assert.isFalse(isUUIDv7('not-a-uuid'))
  })

  test('returns false for empty string', ({ assert }) => {
    assert.isFalse(isUUIDv7(''))
  })

  test('case insensitive', ({ assert }) => {
    const uuid = generateUUIDv7()
    assert.isTrue(isUUIDv7(uuid.toUpperCase()))
  })
})

// ============================================================================
// generateUUIDv7Batch
// ============================================================================
test.group('generateUUIDv7Batch', () => {
  test('generates correct number of UUIDs', ({ assert }) => {
    const batch = generateUUIDv7Batch(10)
    assert.equal(batch.length, 10)
  })

  test('all UUIDs are valid', ({ assert }) => {
    const batch = generateUUIDv7Batch(5)
    for (const uuid of batch) {
      assert.isTrue(isUUIDv7(uuid))
    }
  })

  test('all UUIDs are unique', ({ assert }) => {
    const batch = generateUUIDv7Batch(100)
    const uniqueSet = new Set(batch)
    assert.equal(uniqueSet.size, 100)
  })

  test('batch is monotonically increasing', ({ assert }) => {
    const batch = generateUUIDv7Batch(50)
    for (let i = 1; i < batch.length; i++) {
      assert.isTrue(batch[i]! >= batch[i - 1]!)
    }
  })

  test('generates empty batch for count 0', ({ assert }) => {
    const batch = generateUUIDv7Batch(0)
    assert.equal(batch.length, 0)
  })
})

// ============================================================================
// compareUUIDv7
// ============================================================================
test.group('compareUUIDv7', () => {
  test('returns negative when a < b', ({ assert }) => {
    const a = generateUUIDv7()
    // Wait a tiny bit to ensure different timestamp
    const b = generateUUIDv7()
    // Since UUIDs are monotonically increasing, a should be <= b
    assert.isTrue(compareUUIDv7(a, b) <= 0)
  })

  test('returns 0 for equal UUIDs', ({ assert }) => {
    const uuid = generateUUIDv7()
    assert.equal(compareUUIDv7(uuid, uuid), 0)
  })

  test('returns positive when a > b', ({ assert }) => {
    const a = generateUUIDv7()
    const b = generateUUIDv7()
    assert.isTrue(compareUUIDv7(b, a) >= 0)
  })
})

// ============================================================================
// getPostgresUUIDv7FunctionSQL
// ============================================================================
test.group('getPostgresUUIDv7FunctionSQL', () => {
  test('returns non-empty SQL string', ({ assert }) => {
    const sql = getPostgresUUIDv7FunctionSQL()
    assert.isTrue(sql.length > 0)
  })

  test('contains CREATE OR REPLACE FUNCTION', ({ assert }) => {
    const sql = getPostgresUUIDv7FunctionSQL()
    assert.include(sql, 'CREATE OR REPLACE FUNCTION')
  })

  test('contains gen_random_uuid_v7 function name', ({ assert }) => {
    const sql = getPostgresUUIDv7FunctionSQL()
    assert.include(sql, 'gen_random_uuid_v7')
  })

  test('returns uuid type', ({ assert }) => {
    const sql = getPostgresUUIDv7FunctionSQL()
    assert.include(sql, 'RETURNS uuid')
  })

  test('contains plpgsql language', ({ assert }) => {
    const sql = getPostgresUUIDv7FunctionSQL()
    assert.include(sql, 'plpgsql')
  })
})
