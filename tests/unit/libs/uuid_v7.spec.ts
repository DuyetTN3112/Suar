import { test } from '@japa/runner'
import {
  generateUUIDv7,
  extractTimestamp,
  isUUIDv7,
  generateUUIDv7Batch,
  compareUUIDv7,
  getPostgresUUIDv7FunctionSQL,
} from '#libs/uuid_v7'

const UUID_V4 = '550e8400-e29b-41d4-a716-446655440000'

test.group('UUID v7 utils', () => {
  test('single and batched generation preserve RFC 9562 shape, uniqueness, and sort order', ({
    assert,
  }) => {
    const uuid = generateUUIDv7()
    const batch = generateUUIDv7Batch(10)

    assert.match(uuid, /^[\da-f]{8}-[\da-f]{4}-7[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i)
    assert.equal(uuid.charAt(14), '7')
    assert.match(uuid.charAt(19), /[89ab]/i)
    assert.equal(batch.length, 10)
    assert.equal(new Set(batch).size, batch.length)
    for (let index = 1; index < batch.length; index++) {
      const current = batch[index]
      const previous = batch[index - 1]
      if (!current || !previous) {
        assert.fail('Generated UUID batch should not contain empty entries')
      }
      assert.isTrue(current >= previous)
    }
    assert.deepEqual(generateUUIDv7Batch(0), [])
  })

  test('timestamp extraction and comparison keep chronological semantics while rejecting non-v7 input', ({
    assert,
  }) => {
    const before = Date.now()
    const first = generateUUIDv7()
    const second = generateUUIDv7()
    const after = Date.now()
    const timestamp = extractTimestamp(first)

    assert.isAtLeast(timestamp.getTime(), before)
    assert.isAtMost(timestamp.getTime(), after)
    assert.isAtMost(compareUUIDv7(first, second), 0)
    assert.equal(compareUUIDv7(first, first), 0)
    assert.throws(() => extractTimestamp('not-a-uuid'), /Invalid UUID format/)
    assert.isTrue(isUUIDv7(first))
    assert.isTrue(isUUIDv7(first.toUpperCase()))
    assert.isFalse(isUUIDv7(UUID_V4))
    assert.isFalse(isUUIDv7('not-a-uuid'))
  })

  test('SQL helper preserves the expected migration surface for database-side generation', ({
    assert,
  }) => {
    const sql = getPostgresUUIDv7FunctionSQL()

    assert.include(sql, 'CREATE OR REPLACE FUNCTION')
    assert.include(sql, 'gen_random_uuid_v7')
    assert.include(sql, 'RETURNS uuid')
    assert.include(sql, 'plpgsql')
  })
})
