import { test } from '@japa/runner'

import {
  CacheValueCorruptionError,
  decodeCacheValue,
  encodeCacheValue,
} from '#modules/cache/infra/cache_codec'

test.group('Cache codec', () => {
  test('round-trips strings without coercing JSON-looking content', ({ assert }) => {
    for (const value of ['123', 'true', 'null', '{"kind":"string"}']) {
      assert.strictEqual(decodeCacheValue(encodeCacheValue(value)), value)
    }
  })

  test('round-trips JSON values including null', ({ assert }) => {
    const values: unknown[] = [null, 123, true, ['a', 2], { nested: { enabled: false } }]

    for (const value of values) {
      assert.deepEqual(decodeCacheValue(encodeCacheValue(value)), value)
    }
  })

  test('reads legacy JSON and plain-string entries', ({ assert }) => {
    assert.deepEqual(decodeCacheValue('{"legacy":true}'), { legacy: true })
    assert.equal(decodeCacheValue('legacy-plain-text'), 'legacy-plain-text')
  })

  test('rejects malformed JSON-like entries instead of returning cache poison', ({ assert }) => {
    for (const corrupted of ['{"legacy":', '[1,', '"unterminated', 'true!']) {
      assert.throws(() => decodeCacheValue(corrupted), CacheValueCorruptionError)
    }
  })

  test('rejects values that JSON would silently corrupt', ({ assert }) => {
    assert.throws(() => encodeCacheValue(undefined), /cannot be undefined/)
    assert.throws(() => encodeCacheValue({ missing: undefined }), /unsupported type/)
    assert.throws(() => encodeCacheValue({ amount: 1n }), /unsupported type/)
    assert.throws(() => encodeCacheValue({ score: Number.NaN }), /non-finite/)
  })
})
