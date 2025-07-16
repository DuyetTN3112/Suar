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
  retry,
} from '#libs/typescript_utils'

test.group('TypeScript utils', () => {
  test('runtime exhaustiveness, structural helpers, and guards keep object handling predictable', ({
    assert,
  }) => {
    const obj = { a: 1, b: 2, c: 3 }

    assert.throws(() => assertNever('unexpected' as never), /Unexpected object/)
    assert.deepEqual(typedKeys(obj).sort(), ['a', 'b', 'c'])
    assert.deepEqual(
      typedEntries(obj).sort(([left], [right]) => left.localeCompare(right)),
      [
        ['a', 1],
        ['b', 2],
        ['c', 3],
      ]
    )
    assert.deepEqual(pick(obj, ['a', 'c']), { a: 1, c: 3 })
    assert.deepEqual(omit(obj, ['b']), { a: 1, c: 3 })
    assert.isTrue(isObject({ key: 'value' }))
    assert.isFalse(isObject([1, 2, 3]))
    assert.isTrue(isArray([1, 2, 3]))
    assert.isFalse(isArray({}))
    assert.isTrue(isString('hello'))
    assert.isFalse(isString(42))
    assert.isTrue(isNumber(3.14))
    assert.isFalse(isNumber(Number.NaN))
    assert.isTrue(isBoolean(false))
    assert.isFalse(isBoolean('true'))
    assert.isTrue(isNullish(undefined))
    assert.isTrue(isNullish(null))
    assert.isFalse(isNullish(false))
    assert.isTrue(isNonNullish(0))
    assert.isFalse(isNonNullish(null))
  })

  test('deepClone and deepMerge preserve nested isolation while merging recursively', ({
    assert,
  }) => {
    const original = { a: 1, nested: { value: 2 }, list: [1, 2, 3] }
    const clone = deepClone(original)
    const merged = deepMerge(
      { config: { host: 'localhost', port: 3000 }, enabled: true },
      { config: { port: 8080 }, enabled: false }
    )

    clone.nested.value = 99
    clone.list.push(4)

    assert.deepEqual(original, { a: 1, nested: { value: 2 }, list: [1, 2, 3] })
    assert.deepEqual(clone, { a: 1, nested: { value: 99 }, list: [1, 2, 3, 4] })
    assert.deepEqual(merged, {
      config: { host: 'localhost', port: 8080 },
      enabled: false,
    })
  })

  test('retry succeeds for transient failures and stops at the configured denial boundary', async ({
    assert,
  }) => {
    let attempts = 0
    let exhaustedAttempts = 0
    let shortCircuitAttempts = 0

    const immediate = await retry(() => Promise.resolve('success'), {
      maxRetries: 3,
      baseDelay: 1,
    })
    const eventual = await retry(
      () => {
        attempts++
        return attempts < 3 ? Promise.reject(new Error('fail')) : Promise.resolve('done')
      },
      { maxRetries: 3, baseDelay: 1 }
    )

    assert.equal(immediate, 'success')
    assert.equal(eventual, 'done')
    assert.equal(attempts, 3)

    await assert.rejects(() =>
      retry(
        () => {
          exhaustedAttempts++
          return Promise.reject(new Error('always fail'))
        },
        { maxRetries: 2, baseDelay: 1 }
      )
    )
    await assert.rejects(() =>
      retry(
        () => {
          shortCircuitAttempts++
          return Promise.reject(new Error('do not retry'))
        },
        {
          maxRetries: 5,
          baseDelay: 1,
          shouldRetry: () => false,
        }
      )
    )

    assert.equal(exhaustedAttempts, 3)
    assert.equal(shortCircuitAttempts, 1)
  })
})
