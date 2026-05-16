import Redis from '@adonisjs/redis/services/main'
import { test } from '@japa/runner'

import RedisCacheStore from '#modules/cache/infra/adapters/cache-runtime/redis_cache_store'

test.group('RedisCacheStore.has failure semantics', () => {
  test('propagates Redis failures instead of reporting a cache miss', async ({ assert }) => {
    const redisFailure = new Error('simulated cache Redis outage')
    const connectionDescriptor = Object.getOwnPropertyDescriptor(Redis, 'connection')
    const originalCacheDriver = process.env['CACHE_INTEGRATION_DRIVER']

    Object.defineProperty(Redis, 'connection', {
      configurable: true,
      value: () => ({
        exists: () => Promise.reject(redisFailure),
        ioConnection: {
          status: 'ready',
        },
      }),
    })
    process.env['CACHE_INTEGRATION_DRIVER'] = 'redis'

    try {
      await assert.rejects(
        () => RedisCacheStore.has('cache-service:failure-semantics'),
        /simulated cache Redis outage/
      )
    } finally {
      if (connectionDescriptor) {
        Object.defineProperty(Redis, 'connection', connectionDescriptor)
      } else {
        Reflect.deleteProperty(Redis, 'connection')
      }
      if (originalCacheDriver === undefined) {
        delete process.env['CACHE_INTEGRATION_DRIVER']
      } else {
        process.env['CACHE_INTEGRATION_DRIVER'] = originalCacheDriver
      }
    }
  })
})
