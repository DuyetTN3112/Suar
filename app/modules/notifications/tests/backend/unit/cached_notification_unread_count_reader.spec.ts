import { test } from '@japa/runner'

import type {
  NotificationUnreadCacheReader,
  NotificationUnreadStateReader,
  NotificationUnreadStateWriter,
} from '#modules/notifications/actions/ports/outbound/notification_unread_state'
import { CachedNotificationUnreadCountReader } from '#modules/notifications/infra/cache/cached_notification_unread_count_reader'
import type { PlatformEvent } from '#modules/observability/public_contracts/platform_observability'

test.group('Unit | Cached Notification Unread Count Reader', () => {
  test('serves a valid revisioned Redis value without PostgreSQL', async ({ assert }) => {
    let canonicalCalls = 0
    const service = new CachedNotificationUnreadCountReader({
      cache: {
        get: () => Promise.resolve(JSON.stringify({ count: 12, revision: 431 })),
      },
      canonical: {
        read: () => {
          canonicalCalls += 1
          return Promise.resolve({ count: 0, revision: 1 })
        },
      },
      cacheWriter: {
        apply: () => Promise.resolve(true),
      },
    })

    const result = await service.get('11111111-1111-4111-8111-111111111111')

    assert.deepEqual(result, { count: 12, revision: 431, source: 'redis' })
    assert.equal(canonicalCalls, 0)
  })

  test('strong consistency bypasses stale Redis and refreshes it from PostgreSQL', async ({
    assert,
  }) => {
    let cacheReads = 0
    const writes: unknown[] = []
    const service = new CachedNotificationUnreadCountReader({
      cache: {
        get: () => {
          cacheReads += 1
          return Promise.resolve(JSON.stringify({ count: 12, revision: 431 }))
        },
      },
      canonical: {
        read: () => Promise.resolve({ count: 7, revision: 432 }),
      },
      cacheWriter: {
        apply: (value) => {
          writes.push(value)
          return Promise.resolve(true)
        },
      },
    })

    const result = await service.get('11111111-1111-4111-8111-111111111111', {
      consistency: 'strong',
    })

    assert.deepEqual(result, { count: 7, revision: 432, source: 'postgres' })
    assert.equal(cacheReads, 0)
    assert.deepEqual(writes, [
      {
        recipientId: '11111111-1111-4111-8111-111111111111',
        count: 7,
        revision: 432,
      },
    ])
  })

  test('falls back to canonical state and rebuilds cache with the same CAS path', async ({
    assert,
  }) => {
    const writes: unknown[] = []
    const cache: NotificationUnreadCacheReader = {
      get: () => Promise.resolve('malformed'),
    }
    const canonical: NotificationUnreadStateReader = {
      read: () => Promise.resolve({ count: 7, revision: 44 }),
    }
    const cacheWriter: NotificationUnreadStateWriter = {
      apply: (value) => {
        writes.push(value)
        return Promise.resolve(true)
      },
    }
    const service = new CachedNotificationUnreadCountReader({
      cache,
      canonical,
      cacheWriter,
    })

    const result = await service.get('11111111-1111-4111-8111-111111111111')

    assert.deepEqual(result, { count: 7, revision: 44, source: 'postgres' })
    assert.deepEqual(writes, [
      {
        recipientId: '11111111-1111-4111-8111-111111111111',
        count: 7,
        revision: 44,
      },
    ])
  })

  test('Redis outage and best-effort rebuild failure never hide canonical count', async ({
    assert,
  }) => {
    const events: PlatformEvent[] = []
    const recipientId = '11111111-1111-4111-8111-111111111111'
    const secret = 'redis-credential-do-not-log'
    const service = new CachedNotificationUnreadCountReader({
      cache: {
        get: () => Promise.reject(new Error(`redis unavailable: ${secret}`)),
      },
      canonical: {
        read: () => Promise.resolve({ count: 3, revision: 9 }),
      },
      cacheWriter: {
        apply: () => Promise.reject(new Error(`redis still unavailable: ${secret}`)),
      },
      operationalLogger: {
        log: (_level, event) => {
          events.push(event)
          throw new Error('telemetry sink unavailable')
        },
      },
    })

    assert.deepEqual(await service.get(recipientId), {
      count: 3,
      revision: 9,
      source: 'postgres',
    })
    assert.deepEqual(
      events.map((event) => event.stage),
      ['cache_read_failed', 'cache_rebuild_failed']
    )
    assert.isTrue(events.every((event) => event.error?.['class'] === 'Error'))
    assert.notInclude(JSON.stringify(events), secret)
    assert.notInclude(JSON.stringify(events), recipientId)
  })

  test('negative-caches an empty recipient state at revision zero', async ({ assert }) => {
    const writes: unknown[] = []
    const service = new CachedNotificationUnreadCountReader({
      cache: {
        get: () => Promise.resolve(null),
      },
      canonical: {
        read: () => Promise.resolve({ count: 0, revision: 0 }),
      },
      cacheWriter: {
        apply: (value) => {
          writes.push(value)
          return Promise.resolve(true)
        },
      },
    })

    assert.deepEqual(await service.get('11111111-1111-4111-8111-111111111111'), {
      count: 0,
      revision: 0,
      source: 'postgres',
    })
    assert.deepEqual(writes, [
      {
        recipientId: '11111111-1111-4111-8111-111111111111',
        count: 0,
        revision: 0,
      },
    ])
  })
})
