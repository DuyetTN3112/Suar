import { test } from '@japa/runner'

import ValidationException from '#modules/errors/public_contracts/validation_exception'
import {
  buildCacheKeyRequest,
  buildFlushCacheRequest,
  buildSetCacheValueRequest,
} from '#modules/http/controllers/mappers/request/cache/cache_admin_request_mapper'

test.group('', () => {
  test('maps set, key, and flush inputs', ({ assert }) => {
    assert.deepEqual(buildSetCacheValueRequest({ key: ' cache:key ', value: null }), {
      key: 'cache:key', value: null, ttl: 3600,
    })
    assert.deepEqual(buildCacheKeyRequest({ key: ' cache:key ' }), { key: 'cache:key' })
    assert.deepEqual(buildFlushCacheRequest(' confirm '), { confirmation: 'confirm' })
  })

  test('rejects malformed cache transport values before application execution', ({ assert }) => {
    try {
      buildSetCacheValueRequest({ key: 'cache:key', value: {}, ttl: '60' })
      assert.fail('Expected invalid ttl to be rejected')
    } catch (error) {
      assert.instanceOf(error, ValidationException)
      assert.equal((error as ValidationException).issues[0]?.path, 'ttl')
    }
  })

})
