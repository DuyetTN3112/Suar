import { test } from '@japa/runner'

import type {
  NotificationCanonicalFeedReader,
  NotificationFeedFallbackAdmissionController,
  NotificationSearchFeedReader,
} from '#modules/notifications/actions/ports/outbound/notification-feed/notification_feed_readers'
import type { NotificationRecord } from '#modules/notifications/actions/ports/outbound/notification_repository'
import {
  NotificationFeedCursorError,
  NotificationFeedFallbackCapacityError,
} from '#modules/notifications/domain/notification-feed/notification_contract_errors'
import { ResilientNotificationFeedReader } from '#modules/notifications/infra/adapters/notification-feed/resilient_notification_feed_reader'

function record(id: string): NotificationRecord {
  return {
    id,
    event_id: '11111111-1111-4111-8111-111111111111',
    user_id: 'recipient-1',
    title: id,
    message: id,
    is_read: false,
    type: 'info',
    related_entity_type: null,
    related_entity_id: null,
    metadata: null,
    schema_version: 1,
    category: 'system',
    priority: 'normal',
    action: null,
    revision: 1,
    occurred_at: new Date('2026-07-23T00:00:00.000Z'),
    created_at: new Date('2026-07-23T00:00:00.000Z'),
    updated_at: new Date('2026-07-23T00:00:00.000Z'),
    read_at: null,
  }
}

test.group('Unit | Resilient Notification Feed Reader', () => {
  test('Elasticsearch mode avoids canonical feed reads for cursor-compatible windows', async ({
    assert,
  }) => {
    let canonicalCalls = 0
    const canonical: NotificationCanonicalFeedReader = {
      read: () => {
        canonicalCalls += 1
        return Promise.resolve({
          data: [record('pg')],
          total: 1,
          nextCursor: null,
          previousCursor: null,
          hasNextPage: false,
          hasPreviousPage: false,
        })
      },
    }
    const search: NotificationSearchFeedReader = {
      findByRecipient: () =>
        Promise.resolve({
          data: [record('es')],
          nextCursor: 'next',
          previousCursor: null,
          hasNextPage: true,
          hasPreviousPage: false,
        }),
    }
    const service = new ResilientNotificationFeedReader({
      mode: 'elasticsearch',
      canonical,
      search,
    })

    const result = await service.read({
      recipientId: 'recipient-1',
      page: 1,
      limit: 20,
      unreadOnly: false,
      after: null,
      before: null,
    })

    assert.equal(result.source, 'elasticsearch')
    assert.equal(result.data[0]?.id, 'es')
    assert.equal(result.total, null)
    assert.equal(result.nextCursor, 'next')
    assert.equal(canonicalCalls, 0)
  })

  test('transient search failure falls back and opens a bounded circuit', async ({ assert }) => {
    let searchCalls = 0
    let canonicalCalls = 0
    let now = new Date('2026-07-23T00:00:00.000Z')
    const canonical: NotificationCanonicalFeedReader = {
      read: () => {
        canonicalCalls += 1
        return Promise.resolve({
          data: [record('pg')],
          total: 1,
          nextCursor: null,
          previousCursor: null,
          hasNextPage: false,
          hasPreviousPage: false,
        })
      },
    }
    const search: NotificationSearchFeedReader = {
      findByRecipient: () => {
        searchCalls += 1
        return Promise.reject(new Error('search unavailable'))
      },
    }
    const service = new ResilientNotificationFeedReader({
      mode: 'elasticsearch',
      canonical,
      search,
      circuitFailureThreshold: 1,
      circuitOpenMs: 30_000,
      now: () => now,
    })
    const input = {
      recipientId: 'recipient-1',
      page: 1,
      limit: 20,
      unreadOnly: false,
      after: null,
      before: null,
    }

    const first = await service.read(input)
    const second = await service.read(input)
    now = new Date('2026-07-23T00:00:31.000Z')
    await service.read(input)

    assert.equal(first.source, 'postgres_fallback')
    assert.equal(second.source, 'postgres_fallback')
    assert.equal(searchCalls, 2)
    assert.equal(canonicalCalls, 3)
  })

  test('does not request an exact PostgreSQL count on the Elasticsearch fallback path', async ({
    assert,
  }) => {
    let includeTotal: boolean | undefined
    const service = new ResilientNotificationFeedReader({
      mode: 'elasticsearch',
      canonical: {
        read: (input) => {
          includeTotal = (input as typeof input & { includeTotal?: boolean }).includeTotal
          return Promise.resolve({
            data: [],
            total: null,
            nextCursor: null,
            previousCursor: null,
            hasNextPage: false,
            hasPreviousPage: false,
          })
        },
      },
      search: {
        findByRecipient: () => Promise.reject(new Error('ES unavailable')),
      },
    })

    const result = await service.read({
      recipientId: 'recipient-1',
      page: 1,
      limit: 20,
      unreadOnly: false,
      after: null,
      before: null,
    })

    assert.equal(result.source, 'postgres_fallback')
    assert.isNull(result.total)
    assert.isFalse(includeTotal)
  })

  test('invalid signed cursor is a client error and never degrades into another window', async ({
    assert,
  }) => {
    let canonicalCalls = 0
    const service = new ResilientNotificationFeedReader({
      mode: 'elasticsearch',
      canonical: {
        read: () => {
          canonicalCalls += 1
          return Promise.resolve({
            data: [],
            total: 0,
            nextCursor: null,
            previousCursor: null,
            hasNextPage: false,
            hasPreviousPage: false,
          })
        },
      },
      search: {
        findByRecipient: () => Promise.reject(new NotificationFeedCursorError()),
      },
    })

    await assert.rejects(() =>
      service.read({
        recipientId: 'recipient-1',
        page: 1,
        limit: 20,
        unreadOnly: false,
        after: 'tampered',
        before: null,
      })
    )
    assert.equal(canonicalCalls, 0)
  })

  test('shadow mode returns PostgreSQL truth while comparing the search candidate', async ({
    assert,
  }) => {
    const comparisons: unknown[] = []
    let resolveSearch:
      | ((value: {
          data: NotificationRecord[]
          nextCursor: string | null
          previousCursor: string | null
          hasNextPage: boolean
          hasPreviousPage: boolean
        }) => void)
      | undefined
    const canonicalResult = {
      data: [record('pg')],
      total: 1,
      nextCursor: null,
      previousCursor: null,
      hasNextPage: false,
      hasPreviousPage: false,
    }
    const service = new ResilientNotificationFeedReader({
      mode: 'shadow',
      canonical: {
        read: () => Promise.resolve(canonicalResult),
      },
      search: {
        findByRecipient: () =>
          new Promise((resolve) => {
            resolveSearch = resolve
          }),
      },
      now: () => new Date('2026-07-23T00:00:10.000Z'),
      onShadowComparison: (comparison) => {
        comparisons.push(comparison)
      },
    })

    let readSettled = false
    const readPromise = service
      .read({
        recipientId: 'recipient-1',
        page: 1,
        limit: 20,
        unreadOnly: false,
        after: null,
        before: null,
      })
      .then((result) => {
        readSettled = true
        return result
      })
    await new Promise<void>((resolve) => {
      setImmediate(resolve)
    })
    const didNotWaitForShadow = readSettled
    resolveSearch?.({
      data: [record('es')],
      nextCursor: null,
      previousCursor: null,
      hasNextPage: false,
      hasPreviousPage: false,
    })
    const result = await readPromise
    await new Promise<void>((resolve) => {
      setImmediate(resolve)
    })

    assert.isTrue(didNotWaitForShadow)
    assert.equal(result.source, 'postgres')
    assert.equal(result.data[0]?.id, 'pg')
    assert.deepEqual(comparisons, [
      {
        recipientId: 'recipient-1',
        canonicalIds: ['pg'],
        searchIds: ['es'],
        matches: false,
        classification: 'unexplained_mismatch',
        missingIds: ['pg'],
        extraIds: ['es'],
        staleIds: [],
        stateMismatchIds: [],
        searchAheadIds: [],
        hasNextPageMatches: true,
      },
    ])
  })

  test('shadow mode treats an Elasticsearch revision ahead of PostgreSQL as blocking', async ({
    assert,
  }) => {
    const comparisons: Array<{ classification: string; searchAheadIds: string[] }> = []
    const canonical = record('same-id')
    const search = { ...record('same-id'), revision: 2 }
    const service = new ResilientNotificationFeedReader({
      mode: 'shadow',
      canonical: {
        read: () =>
          Promise.resolve({
            data: [canonical],
            total: 1,
            nextCursor: null,
            previousCursor: null,
            hasNextPage: false,
            hasPreviousPage: false,
          }),
      },
      search: {
        findByRecipient: () =>
          Promise.resolve({
            data: [search],
            nextCursor: null,
            previousCursor: null,
            hasNextPage: false,
            hasPreviousPage: false,
          }),
      },
      now: () => new Date('2026-07-23T00:00:01.000Z'),
      onShadowComparison: (comparison) => {
        comparisons.push(comparison)
      },
    })

    await service.read({
      recipientId: 'recipient-1',
      page: 1,
      limit: 20,
      unreadOnly: false,
      after: null,
      before: null,
    })
    await new Promise<void>((resolve) => {
      setImmediate(resolve)
    })

    assert.equal(comparisons[0]?.classification, 'unexplained_mismatch')
    assert.deepEqual(comparisons[0]?.searchAheadIds, ['same-id'])
  })

  test('bounds concurrent PostgreSQL fallback reads per instance', async ({ assert }) => {
    let releaseCanonical: (() => void) | undefined
    const canonical: NotificationCanonicalFeedReader = {
      read: () =>
        new Promise((resolve) => {
          releaseCanonical = () =>
            resolve({
              data: [],
              total: 0,
              nextCursor: null,
              previousCursor: null,
              hasNextPage: false,
              hasPreviousPage: false,
            })
        }),
    }
    const service = new ResilientNotificationFeedReader({
      mode: 'elasticsearch',
      fallbackMaxConcurrent: 1,
      canonical,
      search: {
        findByRecipient: () => Promise.reject(new Error('ES unavailable')),
      },
    })
    const input = {
      recipientId: 'recipient-1',
      page: 1,
      limit: 20,
      unreadOnly: false,
      after: null,
      before: null,
    }

    const first = service.read(input)
    await new Promise<void>((resolve) => {
      setImmediate(resolve)
    })
    await assert.rejects(() => service.read(input), NotificationFeedFallbackCapacityError)
    releaseCanonical?.()
    const result = await first
    assert.equal(result.source, 'postgres_fallback')
  })

  test('requires and releases a cluster-wide admission lease around PostgreSQL fallback', async ({
    assert,
  }) => {
    let releaseCanonical: (() => void) | undefined
    let acquireCalls = 0
    let releaseCalls = 0
    let canonicalCalls = 0
    const admission: NotificationFeedFallbackAdmissionController = {
      acquire: () => {
        acquireCalls += 1
        if (acquireCalls > 1) {
          return Promise.resolve(null)
        }
        return Promise.resolve({
          release: () => {
            releaseCalls += 1
            return Promise.resolve()
          },
        })
      },
    }
    const service = new ResilientNotificationFeedReader({
      mode: 'elasticsearch',
      fallbackMaxConcurrent: 2,
      fallbackAdmission: admission,
      canonical: {
        read: () => {
          canonicalCalls += 1
          return new Promise((resolve) => {
            releaseCanonical = () =>
              resolve({
                data: [],
                total: 0,
                nextCursor: null,
                previousCursor: null,
                hasNextPage: false,
                hasPreviousPage: false,
              })
          })
        },
      },
      search: {
        findByRecipient: () => Promise.reject(new Error('ES unavailable')),
      },
    })
    const input = {
      recipientId: 'recipient-1',
      page: 1,
      limit: 20,
      unreadOnly: false,
      after: null,
      before: null,
    }

    const admitted = service.read(input)
    await new Promise<void>((resolve) => {
      setImmediate(resolve)
    })
    await assert.rejects(() => service.read(input), NotificationFeedFallbackCapacityError)
    assert.equal(canonicalCalls, 1)
    assert.equal(releaseCalls, 0)

    releaseCanonical?.()
    const admittedResult = await admitted
    assert.equal(admittedResult.source, 'postgres_fallback')
    assert.equal(acquireCalls, 2)
    assert.equal(releaseCalls, 1)
  })

  test('releases the cluster admission lease when the canonical fallback fails', async ({
    assert,
  }) => {
    let releaseCalls = 0
    const service = new ResilientNotificationFeedReader({
      mode: 'elasticsearch',
      fallbackAdmission: {
        acquire: () =>
          Promise.resolve({
            release: () => {
              releaseCalls += 1
              return Promise.resolve()
            },
          }),
      },
      canonical: {
        read: () => Promise.reject(new Error('PostgreSQL unavailable')),
      },
      search: {
        findByRecipient: () => Promise.reject(new Error('ES unavailable')),
      },
    })

    await assert.rejects(() =>
      service.read({
        recipientId: 'recipient-1',
        page: 1,
        limit: 20,
        unreadOnly: false,
        after: null,
        before: null,
      })
    )
    assert.equal(releaseCalls, 1)
  })

  test('emits low-cardinality search, admission, and read outcomes', async ({ assert }) => {
    const events: string[] = []
    const service = new ResilientNotificationFeedReader({
      mode: 'elasticsearch',
      telemetry: {
        recordRead: (source, outcome) => events.push(`read:${source}:${outcome}`),
        recordSearch: (outcome) => events.push(`search:${outcome}`),
        recordFallbackAdmission: (outcome) => events.push(`admission:${outcome}`),
      },
      fallbackAdmission: {
        acquire: () =>
          Promise.resolve({
            release: () => Promise.resolve(),
          }),
      },
      canonical: {
        read: () =>
          Promise.resolve({
            data: [],
            total: null,
            nextCursor: null,
            previousCursor: null,
            hasNextPage: false,
            hasPreviousPage: false,
          }),
      },
      search: {
        findByRecipient: () => Promise.reject(new Error('ES unavailable')),
      },
    })

    await service.read({
      recipientId: 'recipient-1',
      page: 1,
      limit: 20,
      unreadOnly: false,
      after: null,
      before: null,
    })

    assert.deepEqual(events, [
      'search:failure',
      'admission:acquired',
      'read:postgres_fallback:success',
    ])
  })
})
