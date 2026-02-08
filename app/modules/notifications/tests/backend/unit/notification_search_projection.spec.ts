import { test } from '@japa/runner'

import type {
  ActiveNotificationSearchDocument,
  NotificationSearchDocument,
  NotificationSearchTransport,
} from '#modules/notifications/infra/search/notification_search_index_repository'
import {
  NOTIFICATION_SEARCH_MAPPING,
  NotificationSearchIndexRepository,
} from '#modules/notifications/infra/search/notification_search_index_repository'

function activeDocument(
  notificationId: string,
  revision: number
): ActiveNotificationSearchDocument {
  return {
    notificationId,
    eventId: `event-${notificationId}`,
    recipientId: 'recipient-1',
    scopeType: 'user',
    scopeId: 'recipient-1',
    organizationId: null,
    type: 'info',
    schemaVersion: 1,
    category: 'system',
    priority: 'normal',
    state: 'unread',
    title: 'A bounded title',
    body: 'A bounded body',
    relatedEntityType: null,
    relatedEntityId: null,
    action: null,
    metadata: null,
    occurredAt: '2026-07-23T00:00:00.000Z',
    createdAt: '2026-07-23T00:00:00.000Z',
    updatedAt: '2026-07-23T00:00:00.000Z',
    readAt: null,
    revision,
    projectionVersion: 1,
    deleted: false,
    deletedAt: null,
  }
}

function tombstoneDocument(notificationId: string, revision: number): NotificationSearchDocument {
  return {
    notificationId,
    recipientId: 'recipient-1',
    revision,
    projectionVersion: 1,
    deleted: true,
    deletedAt: '2026-07-23T00:00:00.000Z',
  }
}

test.group('Unit | Notification Search Projection', () => {
  test('uses a strict allowlisted mapping with disabled arbitrary objects', ({ assert }) => {
    assert.equal(NOTIFICATION_SEARCH_MAPPING.dynamic, 'strict')
    assert.deepEqual(Object.keys(NOTIFICATION_SEARCH_MAPPING.properties).sort(), [
      'action',
      'body',
      'category',
      'createdAt',
      'deleted',
      'deletedAt',
      'eventId',
      'metadata',
      'notificationId',
      'occurredAt',
      'organizationId',
      'priority',
      'projectionVersion',
      'readAt',
      'recipientId',
      'relatedEntityId',
      'relatedEntityType',
      'revision',
      'schemaVersion',
      'scopeId',
      'scopeType',
      'state',
      'title',
      'type',
      'updatedAt',
    ])
    assert.deepEqual(NOTIFICATION_SEARCH_MAPPING.properties.action, {
      type: 'object',
      enabled: false,
    })
    assert.deepEqual(NOTIFICATION_SEARCH_MAPPING.properties.metadata, {
      type: 'object',
      enabled: false,
    })
  })

  test('bulk writes every snapshot with external revision fencing and no refresh', async ({
    assert,
  }) => {
    const calls: Array<{ operations: unknown[]; refresh?: boolean }> = []
    const transport: NotificationSearchTransport = {
      indexExists: () => Promise.resolve(true),
      createIndex: () => Promise.resolve(),
      bulk: (input) => {
        calls.push(input)
        return Promise.resolve({
          errors: false,
          items: [
            { index: { _id: 'notification-1', status: 201 } },
            { index: { _id: 'notification-2', status: 201 } },
          ],
        })
      },
    }
    const repository = new NotificationSearchIndexRepository(transport)

    const result = await repository.projectMany('suar_notifications_feed_v000001', [
      activeDocument('notification-1', 7),
      tombstoneDocument('notification-2', 8),
    ])

    assert.deepEqual(result, {
      appliedIds: ['notification-1', 'notification-2'],
      staleIds: [],
      failures: [],
    })
    assert.lengthOf(calls, 1)
    assert.notProperty(calls[0] ?? {}, 'refresh')
    assert.deepEqual(calls[0]?.operations, [
      {
        index: {
          _index: 'suar_notifications_feed_v000001',
          _id: 'notification-1',
          version: 7,
          version_type: 'external',
        },
      },
      activeDocument('notification-1', 7),
      {
        index: {
          _index: 'suar_notifications_feed_v000001',
          _id: 'notification-2',
          version: 8,
          version_type: 'external',
        },
      },
      tombstoneDocument('notification-2', 8),
    ])
    assert.notProperty(tombstoneDocument('notification-2', 8), 'title')
    assert.notProperty(tombstoneDocument('notification-2', 8), 'body')
    assert.notProperty(tombstoneDocument('notification-2', 8), 'metadata')
  })

  test('classifies each partial bulk result without retrying successes or stale writes', async ({
    assert,
  }) => {
    const transport: NotificationSearchTransport = {
      indexExists: () => Promise.resolve(true),
      createIndex: () => Promise.resolve(),
      bulk: () =>
        Promise.resolve({
          errors: true,
          items: [
            { index: { _id: 'applied', status: 200 } },
            {
              index: {
                _id: 'throttled',
                status: 429,
                error: { type: 'es_rejected_execution_exception', reason: 'busy' },
              },
            },
            {
              index: {
                _id: 'invalid',
                status: 400,
                error: { type: 'strict_dynamic_mapping_exception', reason: 'unknown field' },
              },
            },
            {
              index: {
                _id: 'stale',
                status: 409,
                error: { type: 'version_conflict_engine_exception', reason: 'newer exists' },
              },
            },
          ],
        }),
    }
    const repository = new NotificationSearchIndexRepository(transport)

    const result = await repository.projectMany('notifications-index', [
      activeDocument('applied', 1),
      activeDocument('throttled', 2),
      activeDocument('invalid', 3),
      tombstoneDocument('stale', 4),
    ])

    assert.deepEqual(result.appliedIds, ['applied'])
    assert.deepEqual(result.staleIds, ['stale'])
    assert.deepEqual(
      result.failures.map((failure) => ({
        notificationId: failure.notificationId,
        retryable: failure.retryable,
        errorClass: failure.errorClass,
      })),
      [
        {
          notificationId: 'throttled',
          retryable: true,
          errorClass: 'es_rejected_execution_exception',
        },
        {
          notificationId: 'invalid',
          retryable: false,
          errorClass: 'strict_dynamic_mapping_exception',
        },
      ]
    )
  })

  test('splits bulk requests by the 5 MiB wire budget while preserving result order', async ({
    assert,
  }) => {
    const calls: Array<{ operations: unknown[] }> = []
    const transport: NotificationSearchTransport = {
      indexExists: () => Promise.resolve(true),
      createIndex: () => Promise.resolve(),
      bulk: (input) => {
        calls.push(input)
        return Promise.resolve({
          errors: false,
          items: input.operations
            .filter(
              (operation) =>
                typeof operation === 'object' && operation !== null && 'index' in operation
            )
            .map(() => ({ index: { status: 201 } })),
        })
      },
    }
    const repository = new NotificationSearchIndexRepository(transport)
    const first = { ...activeDocument('large-1', 1), body: 'a'.repeat(3 * 1024 * 1024) }
    const second = { ...activeDocument('large-2', 1), body: 'b'.repeat(3 * 1024 * 1024) }

    const result = await repository.projectMany('notifications-index', [first, second])

    assert.deepEqual(result, {
      appliedIds: ['large-1', 'large-2'],
      staleIds: [],
      failures: [],
    })
    assert.lengthOf(calls, 2)
  })

  test('rejects a single document that exceeds the bulk byte budget', async ({ assert }) => {
    const repository = new NotificationSearchIndexRepository({
      indexExists: () => Promise.resolve(true),
      createIndex: () => Promise.resolve(),
      bulk: () => Promise.resolve({ errors: false, items: [] }),
    })

    await assert.rejects(
      () =>
        repository.projectMany('notifications-index', [
          { ...activeDocument('oversized', 1), body: 'x'.repeat(6 * 1024 * 1024) },
        ]),
      /exceeds the 5 MiB bulk budget/
    )
  })

  test('creates a versioned physical index with aliases only when absent', async ({ assert }) => {
    const created: unknown[] = []
    const transport: NotificationSearchTransport = {
      indexExists: () => Promise.resolve(false),
      createIndex: (input) => {
        created.push(input)
        return Promise.resolve()
      },
      bulk: () => Promise.resolve({ errors: false, items: [] }),
    }
    const repository = new NotificationSearchIndexRepository(transport)

    await repository.ensureIndex({
      physicalIndex: 'suar_notifications_feed_v000001',
      readAlias: 'suar_notifications_read',
      writeAlias: 'suar_notifications_write',
    })

    assert.deepEqual(created, [
      {
        index: 'suar_notifications_feed_v000001',
        aliases: {
          suar_notifications_read: {},
          suar_notifications_write: { is_write_index: true },
        },
        mappings: NOTIFICATION_SEARCH_MAPPING,
      },
    ])
  })

  test('physically purges content-free tombstones in bounded idempotent bulk deletes', async ({
    assert,
  }) => {
    const calls: Array<{ operations: unknown[] }> = []
    const transport: NotificationSearchTransport = {
      indexExists: () => Promise.resolve(true),
      createIndex: () => Promise.resolve(),
      bulk: (input) => {
        calls.push(input)
        return Promise.resolve({
          errors: true,
          items: [
            { delete: { _id: 'notification-1', status: 200 } },
            { delete: { _id: 'notification-2', status: 404 } },
            {
              delete: {
                _id: 'notification-3',
                status: 429,
                error: { type: 'es_rejected_execution_exception', reason: 'busy' },
              },
            },
          ],
        })
      },
    }
    const repository = new NotificationSearchIndexRepository(transport)

    const result = await repository.purgeMany('notifications-index', [
      'notification-1',
      'notification-2',
      'notification-3',
    ])

    assert.deepEqual(calls[0]?.operations, [
      { delete: { _index: 'notifications-index', _id: 'notification-1' } },
      { delete: { _index: 'notifications-index', _id: 'notification-2' } },
      { delete: { _index: 'notifications-index', _id: 'notification-3' } },
    ])
    assert.deepEqual(result.appliedIds, ['notification-1', 'notification-2'])
    assert.deepEqual(result.failures, [
      {
        notificationId: 'notification-3',
        retryable: true,
        status: 429,
        errorClass: 'es_rejected_execution_exception',
        errorMessage: 'busy',
      },
    ])
  })
})
