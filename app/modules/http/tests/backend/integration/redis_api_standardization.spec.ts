import Redis from '@adonisjs/redis/services/main'
import { test } from '@japa/runner'

import { cacheStore } from '#modules/cache/public_contracts/cache_store'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { cleanupTestData, UserFactory } from '#tests/helpers/factories'
import { testId } from '#tests/helpers/test_utils'

test.group('Integration | Redis API standardization', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())

  group.each.teardown(async () => {
    const keys = await Redis.keys('redis-api-standardization:*')
    if (keys.length > 0) await Redis.del(...keys)
    await cacheStore.deleteByPattern('redis-api-standardization:*')

    await cleanupTestData()
  })

  test('redis keys API returns wrapped list without success envelope', async ({
    assert,
    client,
  }) => {
    const superadmin = await UserFactory.createSuperadmin()

    const response = await client
      .get('/api/redis/keys')
      .loginAs(superadmin)
      .qs({ pattern: 'redis-api-standardization:*' })

    response.assertStatus(200)

    const body = response.body() as { data: string[] }

    assert.notProperty(body, 'success')
    assert.isArray(body.data)
  })

  test('redis cache get API returns wrapped object without success envelope', async ({
    assert,
    client,
  }) => {
    const superadmin = await UserFactory.createSuperadmin()
    const key = `redis-api-standardization:${testId()}`

    await cacheStore.set(key, { status: 'warm' }, 60)

    const response = await client.get(`/api/redis/cache/${encodeURIComponent(key)}`).loginAs(superadmin)

    response.assertStatus(200)

    const body = response.body() as {
      data: { key: string; value: { status: string } | null }
    }

    assert.notProperty(body, 'success')
    assert.equal(body.data.key, key)
    assert.deepEqual(body.data.value, { status: 'warm' })
  })

  test('redis cache mutation APIs return 204 and persist side effects', async ({
    assert,
    client,
  }) => {
    const superadmin = await UserFactory.createSuperadmin()
    const setKey = `redis-api-standardization:${testId()}`
    const flushKey = `redis-api-standardization:${testId()}`

    const setResponse = await client
      .post('/api/redis/cache')
      .loginAs(superadmin)
      .json({
        key: setKey,
        value: { source: 'http' },
        ttl: 120,
      })

    setResponse.assertStatus(204)
    assert.deepEqual(await cacheStore.get(setKey), { source: 'http' })

    const clearResponse = await client.delete(`/api/redis/cache/${encodeURIComponent(setKey)}`).loginAs(superadmin)

    clearResponse.assertStatus(204)
    assert.isNull(await cacheStore.get(setKey))

    await cacheStore.set(flushKey, { source: 'flush' }, 60)

    const flushResponse = await client.delete('/api/redis/cache').loginAs(superadmin)

    flushResponse.assertStatus(204)
    assert.isNull(await cacheStore.get(flushKey))
  })
})
