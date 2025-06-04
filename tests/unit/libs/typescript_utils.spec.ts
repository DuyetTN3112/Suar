import { test } from '@japa/runner'
import {
  assertNever,
  typedKeys,
  typedEntries,
  isObject,
  isArray,
  isString,
  isNumber,
  isBoolean,
  isNullish,
  isNonNullish,
  pick,
  omit,
  deepClone,
  deepMerge,
  sleep,
  retry,
} from '#libs/typescript_utils'

// ============================================================================
// assertNever
// ============================================================================
test.group('assertNever', () => {
  test('throws for any value (runtime)', ({ assert }) => {
    assert.throws(() => assertNever('unexpected' as never), /Unexpected object/)
  })
})

// ============================================================================
// typedKeys / typedEntries
// ============================================================================
test.group('typedKeys', () => {
  test('returns keys of object', ({ assert }) => {
    const obj = { a: 1, b: 2, c: 3 }
    const keys = typedKeys(obj)
    assert.deepEqual(keys.sort(), ['a', 'b', 'c'])
  })

  test('returns empty array for empty object', ({ assert }) => {
    assert.deepEqual(typedKeys({}), [])
  })
})

test.group('typedEntries', () => {
  test('returns entries of object', ({ assert }) => {
    const obj = { a: 1, b: 2 }
    const entries = typedEntries(obj)
    assert.equal(entries.length, 2)
  })
})

// ============================================================================
// Type guard functions
// ============================================================================
test.group('isObject', () => {
  test('returns true for plain object', ({ assert }) => {
    assert.isTrue(isObject({ key: 'value' }))
  })

  test('returns true for empty object', ({ assert }) => {
    assert.isTrue(isObject({}))
  })

  test('returns false for array', ({ assert }) => {
    assert.isFalse(isObject([1, 2, 3]))
  })

  test('returns false for null', ({ assert }) => {
    assert.isFalse(isObject(null))
  })

  test('returns false for string', ({ assert }) => {
    assert.isFalse(isObject('hello'))
  })

  test('returns false for number', ({ assert }) => {
    assert.isFalse(isObject(42))
  })
})

test.group('isArray', () => {
  test('returns true for array', ({ assert }) => {
    assert.isTrue(isArray([1, 2, 3]))
  })

  test('returns true for empty array', ({ assert }) => {
    assert.isTrue(isArray([]))
  })

  test('returns false for object', ({ assert }) => {
    assert.isFalse(isArray({}))
  })

  test('returns false for string', ({ assert }) => {
    assert.isFalse(isArray('hello'))
  })
})

test.group('isString', () => {
  test('returns true for string', ({ assert }) => {
    assert.isTrue(isString('hello'))
  })

  test('returns true for empty string', ({ assert }) => {
    assert.isTrue(isString(''))
  })

  test('returns false for number', ({ assert }) => {
    assert.isFalse(isString(42))
  })

  test('returns false for null', ({ assert }) => {
    assert.isFalse(isString(null))
  })
})

test.group('isNumber', () => {
  test('returns true for integer', ({ assert }) => {
    assert.isTrue(isNumber(42))
  })

  test('returns true for float', ({ assert }) => {
    assert.isTrue(isNumber(3.14))
  })

  test('returns true for zero', ({ assert }) => {
    assert.isTrue(isNumber(0))
  })

  test('returns false for NaN', ({ assert }) => {
    assert.isFalse(isNumber(Number.NaN))
  })

  test('returns false for string', ({ assert }) => {
    assert.isFalse(isNumber('42'))
  })
})

test.group('isBoolean', () => {
  test('returns true for true', ({ assert }) => {
    assert.isTrue(isBoolean(true))
  })

  test('returns true for false', ({ assert }) => {
    assert.isTrue(isBoolean(false))
  })

  test('returns false for 0', ({ assert }) => {
    assert.isFalse(isBoolean(0))
  })

  test('returns false for string', ({ assert }) => {
    assert.isFalse(isBoolean('true'))
  })
})

test.group('isNullish', () => {
  test('returns true for null', ({ assert }) => {
    assert.isTrue(isNullish(null))
  })

  test('returns true for undefined', ({ assert }) => {
    assert.isTrue(isNullish(undefined))
  })

  test('returns false for 0', ({ assert }) => {
    assert.isFalse(isNullish(0))
  })

  test('returns false for empty string', ({ assert }) => {
    assert.isFalse(isNullish(''))
  })

  test('returns false for false', ({ assert }) => {
    assert.isFalse(isNullish(false))
  })
})

test.group('isNonNullish', () => {
  test('returns true for value', ({ assert }) => {
    assert.isTrue(isNonNullish('hello'))
  })

  test('returns true for 0', ({ assert }) => {
    assert.isTrue(isNonNullish(0))
  })

  test('returns false for null', ({ assert }) => {
    assert.isFalse(isNonNullish(null))
  })

  test('returns false for undefined', ({ assert }) => {
    assert.isFalse(isNonNullish(undefined))
  })
})

// ============================================================================
// pick / omit
// ============================================================================
test.group('pick', () => {
  test('picks specified keys', ({ assert }) => {
    const obj = { a: 1, b: 2, c: 3 }
    const result = pick(obj, ['a', 'c'])
    assert.deepEqual(result, { a: 1, c: 3 })
  })

  test('handles non-existent keys gracefully', ({ assert }) => {
    const obj = { a: 1, b: 2 }
    const result = pick(obj, ['a'])
    assert.deepEqual(result, { a: 1 })
  })

  test('returns empty object for empty keys', ({ assert }) => {
    const obj = { a: 1, b: 2 }
    const result = pick(obj, [])
    assert.deepEqual(result, {})
  })
})

test.group('omit', () => {
  test('omits specified keys', ({ assert }) => {
    const obj = { a: 1, b: 2, c: 3 }
    const result = omit(obj, ['b'])
    assert.deepEqual(result, { a: 1, c: 3 })
  })

  test('returns all keys if nothing to omit', ({ assert }) => {
    const obj = { a: 1, b: 2 }
    const result = omit(obj, [])
    assert.deepEqual(result, { a: 1, b: 2 })
  })

  test('handles omitting all keys', ({ assert }) => {
    const obj = { a: 1, b: 2 }
    const result = omit(obj, ['a', 'b'])
    assert.deepEqual(result, {})
  })
})

// ============================================================================
// deepClone
// ============================================================================
test.group('deepClone', () => {
  test('creates a deep copy', ({ assert }) => {
    const original = { a: 1, b: { c: 2 } }
    const clone = deepClone(original)
    assert.deepEqual(clone, original)
    clone.b.c = 99
    assert.equal(original.b.c, 2) // original is unaffected
  })

  test('clones arrays', ({ assert }) => {
    const original = [1, 2, [3, 4]]
    const clone = deepClone(original)
    assert.deepEqual(clone, original)
  })

  test('handles null', ({ assert }) => {
    assert.isNull(deepClone(null))
  })
})

// ============================================================================
// deepMerge
// ============================================================================
test.group('deepMerge', () => {
  test('merges flat objects', ({ assert }) => {
    const result = deepMerge<{ a?: number; b?: number }>({ a: 1 }, { b: 2 })
    assert.deepEqual(result, { a: 1, b: 2 })
  })

  test('deep merges nested objects', ({ assert }) => {
    const result = deepMerge<{ config: { host: string; port: number } }>(
      { config: { host: 'localhost', port: 3000 } },
      { config: { port: 8080 } } as Partial<{ config: { host: string; port: number } }>
    )
    assert.deepEqual(result, { config: { host: 'localhost', port: 8080 } })
  })

  test('overwrites non-object values', ({ assert }) => {
    const result = deepMerge({ a: 1 }, { a: 2 })
    assert.deepEqual(result, { a: 2 })
  })

  test('handles empty objects', ({ assert }) => {
    const result = deepMerge({}, { a: 1 })
    assert.deepEqual(result, { a: 1 })
  })
})

// ============================================================================
// sleep
// ============================================================================
test.group('sleep', () => {
  test('resolves after delay', async ({ assert }) => {
    const start = Date.now()
    await sleep(50)
    const elapsed = Date.now() - start
    assert.isTrue(elapsed >= 40) // allow small timing variance
  })
})

// ============================================================================
// retry
// ============================================================================
test.group('retry', () => {
  test('returns result on first success', async ({ assert }) => {
    const result = await retry(async () => 'success', { maxRetries: 3, baseDelay: 10 })
    assert.equal(result, 'success')
  })

  test('retries on failure then succeeds', async ({ assert }) => {
    let attempts = 0
    const result = await retry(
      async () => {
        attempts++
        if (attempts < 3) throw new Error('fail')
        return 'done'
      },
      { maxRetries: 3, baseDelay: 10 }
    )
    assert.equal(result, 'done')
    assert.equal(attempts, 3)
  })

  test('throws after max retries exhausted', async ({ assert }) => {
    let attempts = 0
    try {
      await retry(
        async () => {
          attempts++
          throw new Error('always fail')
        },
        { maxRetries: 2, baseDelay: 10 }
      )
      assert.fail('Should have thrown')
    } catch (error) {
      assert.instanceOf(error, Error)
      assert.equal(attempts, 3) // initial + 2 retries
    }
  })

  test('respects shouldRetry predicate', async ({ assert }) => {
    let attempts = 0
    try {
      await retry(
        async () => {
          attempts++
          throw new Error('do not retry')
        },
        {
          maxRetries: 5,
          baseDelay: 10,
          shouldRetry: () => false,
        }
      )
      assert.fail('Should have thrown')
    } catch {
      assert.equal(attempts, 1) // no retries since shouldRetry returns false
    }
  })
})
