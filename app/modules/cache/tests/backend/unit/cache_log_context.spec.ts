import { test } from '@japa/runner'

import { safeCacheLogContext as cacheIdentifierLogContext } from '#modules/cache/public_contracts/cache_contract'

test.group('Cache log context privacy', () => {
  test('exposes only a stable namespace and irreversible identifier digest', ({ assert }) => {
    const sensitiveKey =
      'users:profile:private-user-123:query:raw-search-phrase-must-not-enter-logs'
    const first = cacheIdentifierLogContext(sensitiveKey)
    const second = cacheIdentifierLogContext(sensitiveKey)

    assert.deepEqual(first, second)
    assert.equal(first.cacheNamespace, 'users')
    assert.match(first.cacheIdentifierHash, /^[0-9a-f]{16}$/)
    assert.notInclude(JSON.stringify(first), 'private-user-123')
    assert.notInclude(JSON.stringify(first), 'raw-search-phrase')
  })

  test('sanitizes and bounds an unexpected namespace', ({ assert }) => {
    const context = cacheIdentifierLogContext(`${'!'.repeat(40)}secret:identifier`)

    assert.equal(context.cacheNamespace, 'unknown')
    assert.match(context.cacheIdentifierHash, /^[0-9a-f]{16}$/)
  })
})
