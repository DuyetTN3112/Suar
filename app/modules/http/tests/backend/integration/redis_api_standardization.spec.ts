import db from '@adonisjs/lucid/services/db'
import Redis from '@adonisjs/redis/services/main'
import { test } from '@japa/runner'

import { safeCacheLogContext } from '#modules/cache/public_contracts/cache_contract'
import { cacheStore } from '#modules/cache/public_contracts/cache_store'
import { CACHE_ADMIN_BREAK_GLASS_HEADER } from '#modules/http/middleware/cache_admin_access_middleware'
import env from '#start/env'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { cleanupTestData, UserFactory } from '#tests/helpers/factories'
import { testId } from '#tests/helpers/test_utils'

const CACHE_ADMIN_TEST_TOKEN = 'cache-admin-integration-break-glass-token-v1'

async function countCacheAuditEvents(action: string, entityId: string): Promise<number> {
  const rows = (await db
    .from('audit_events')
    .where('action', action)
    .where('entity_id', entityId)
    .count('* as count')) as { count: number | string }[]

  return Number(rows[0]?.count ?? 0)
}

test.group('Integration | Redis API standardization', (group) => {
  let originalEnvGet: typeof env.get

  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())

  group.each.setup(() => {
    originalEnvGet = env.get.bind(env)
    Reflect.set(env, 'get', (key: string, defaultValue?: unknown) => {
      if (key === 'CACHE_ADMIN_API_ENABLED') return true
      if (key === 'CACHE_ADMIN_BREAK_GLASS_TOKEN') return CACHE_ADMIN_TEST_TOKEN
      return originalEnvGet(key as never, defaultValue as never)
    })
  })

  group.each.teardown(async () => {
    Reflect.set(env, 'get', originalEnvGet)
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
    const cacheKey = `redis-api-standardization:${testId()}`
    const mainOnlyKey = `redis-api-standardization:main:${testId()}`
    await cacheStore.set(cacheKey, { scope: 'cache' }, 60)
    await Redis.setex(mainOnlyKey, 60, 'main-only')

    const response = await client
      .get('/api/redis/keys')
      .loginAs(superadmin)
      .header(CACHE_ADMIN_BREAK_GLASS_HEADER, CACHE_ADMIN_TEST_TOKEN)
      .qs({ pattern: 'redis-api-standardization:*' })

    response.assertStatus(200)

    const body = response.body() as {
      data: string[]
      meta: { nextCursor: string; hasMore: boolean; count: number }
    }

    assert.notProperty(body, 'success')
    assert.isArray(body.data)
    assert.include(body.data, cacheKey)
    assert.notInclude(body.data, mainOnlyKey)
    assert.equal(body.meta.count, 100)
  })

  test('redis cache get API returns wrapped object without success envelope', async ({
    assert,
    client,
  }) => {
    const superadmin = await UserFactory.createSuperadmin()
    const key = `redis-api-standardization:${testId()}`

    await cacheStore.set(key, { status: 'warm' }, 60)

    const response = await client
      .get(`/api/redis/cache/${encodeURIComponent(key)}`)
      .loginAs(superadmin)
      .header(CACHE_ADMIN_BREAK_GLASS_HEADER, CACHE_ADMIN_TEST_TOKEN)

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
    const rejectedSetKey = `redis-api-standardization:rejected:${testId()}`
    const flushKey = `redis-api-standardization:${testId()}`
    const mainFlushSentinelKey = `redis-api-standardization:main-flush-sentinel:${testId()}`

    const setResponse = await client
      .post('/api/redis/cache')
      .loginAs(superadmin)
      .header(CACHE_ADMIN_BREAK_GLASS_HEADER, CACHE_ADMIN_TEST_TOKEN)
      .json({
        key: setKey,
        value: { source: 'http' },
        ttl: 120,
      })

    setResponse.assertStatus(204)
    assert.deepEqual(await cacheStore.get(setKey), { source: 'http' })
    const setKeyDigest = safeCacheLogContext(setKey).cacheIdentifierHash
    assert.equal(await countCacheAuditEvents('cache_key_set_requested', setKeyDigest), 1)
    assert.equal(await countCacheAuditEvents('cache_key_set_requested', setKey), 0)

    const invalidTtlResponse = await client
      .post('/api/redis/cache')
      .loginAs(superadmin)
      .header(CACHE_ADMIN_BREAK_GLASS_HEADER, CACHE_ADMIN_TEST_TOKEN)
      .json({ key: rejectedSetKey, value: 'must-not-be-cached', ttl: 86_401 })
    invalidTtlResponse.assertStatus(400)
    assert.isNull(await cacheStore.get(rejectedSetKey))
    assert.equal(await countCacheAuditEvents('cache_key_set_requested', rejectedSetKey), 0)

    const clearResponse = await client
      .delete(`/api/redis/cache/${encodeURIComponent(setKey)}`)
      .loginAs(superadmin)
      .header(CACHE_ADMIN_BREAK_GLASS_HEADER, CACHE_ADMIN_TEST_TOKEN)

    clearResponse.assertStatus(204)
    assert.isNull(await cacheStore.get(setKey))
    assert.equal(await countCacheAuditEvents('cache_key_clear_requested', setKeyDigest), 1)
    assert.equal(await countCacheAuditEvents('cache_key_clear_requested', setKey), 0)

    await cacheStore.set(flushKey, { source: 'flush' }, 60)
    await Redis.setex(mainFlushSentinelKey, 60, 'must-survive-cache-flush')

    const missingConfirmationResponse = await client
      .delete('/api/redis/cache')
      .loginAs(superadmin)
      .header(CACHE_ADMIN_BREAK_GLASS_HEADER, CACHE_ADMIN_TEST_TOKEN)
    missingConfirmationResponse.assertStatus(422)
    assert.deepEqual(await cacheStore.get(flushKey), { source: 'flush' })

    const flushResponse = await client
      .delete('/api/redis/cache')
      .header('x-confirm-cache-flush', 'flush-cache')
      .loginAs(superadmin)
      .header(CACHE_ADMIN_BREAK_GLASS_HEADER, CACHE_ADMIN_TEST_TOKEN)

    flushResponse.assertStatus(204)
    assert.isNull(await cacheStore.get(flushKey))
    assert.equal(await Redis.get(mainFlushSentinelKey), 'must-survive-cache-flush')
    assert.equal(await countCacheAuditEvents('cache_flush_requested', 'cache-db'), 1)
  })

  test('cache control plane fails closed and requires strict superadmin break-glass access', async ({
    assert,
    client,
  }) => {
    const superadmin = await UserFactory.createSuperadmin()
    const systemAdmin = await UserFactory.create({ system_role: 'system_admin' })
    const key = `redis-api-standardization:${testId()}`
    await cacheStore.set(key, { protected: true }, 60)

    const missingToken = await client
      .delete(`/api/redis/cache/${encodeURIComponent(key)}`)
      .loginAs(superadmin)
    missingToken.assertStatus(401)

    const incorrectToken = await client
      .delete(`/api/redis/cache/${encodeURIComponent(key)}`)
      .loginAs(superadmin)
      .header(CACHE_ADMIN_BREAK_GLASS_HEADER, `${CACHE_ADMIN_TEST_TOKEN}-incorrect`)
    incorrectToken.assertStatus(401)

    const broaderAdminRole = await client
      .delete(`/api/redis/cache/${encodeURIComponent(key)}`)
      .loginAs(systemAdmin)
      .header(CACHE_ADMIN_BREAK_GLASS_HEADER, CACHE_ADMIN_TEST_TOKEN)
    broaderAdminRole.assertStatus(403)

    const enabledEnvGet = env.get.bind(env)
    Reflect.set(env, 'get', (envKey: string, defaultValue?: unknown) => {
      if (envKey === 'CACHE_ADMIN_API_ENABLED') return false
      return enabledEnvGet(envKey as never, defaultValue as never)
    })
    const disabledControlPlane = await client
      .delete(`/api/redis/cache/${encodeURIComponent(key)}`)
      .loginAs(systemAdmin)
      .header(CACHE_ADMIN_BREAK_GLASS_HEADER, CACHE_ADMIN_TEST_TOKEN)
    disabledControlPlane.assertStatus(404)
    Reflect.set(env, 'get', enabledEnvGet)

    assert.deepEqual(await cacheStore.get(key), { protected: true })
    assert.equal(
      await countCacheAuditEvents(
        'cache_key_clear_requested',
        safeCacheLogContext(key).cacheIdentifierHash
      ),
      0
    )
  })
})
