import { test } from '@japa/runner'

import {
  NotificationSearchFeedRepository,
  type NotificationSearchFeedTransport,
} from '#modules/notifications/infra/search/notification_search_feed_repository'
import { NotificationFeedCursorCodec } from '#modules/notifications/infra/security/notification_feed_cursor_codec'

test.group('Unit | Notification Search Feed', () => {
  test('forces recipient isolation, bounded search_after pagination, and no exact count', async ({
    assert,
  }) => {
    const requests: unknown[] = []
    const transport: NotificationSearchFeedTransport = {
      search: (request) => {
        requests.push(request)
        return Promise.resolve({
          hits: [
            {
              source: {
                notificationId: '22222222-2222-4222-8222-222222222222',
                eventId: 'event-2',
                recipientId: '11111111-1111-4111-8111-111111111111',
                scopeType: 'user',
                scopeId: '11111111-1111-4111-8111-111111111111',
                organizationId: null,
                type: 'info',
                schemaVersion: 1,
                category: 'system',
                priority: 'normal',
                state: 'unread',
                title: 'Latest',
                body: 'Latest body',
                relatedEntityType: null,
                relatedEntityId: null,
                action: null,
                metadata: null,
                occurredAt: '2026-07-23T00:00:00.000Z',
                createdAt: '2026-07-23T00:00:00.000Z',
                updatedAt: '2026-07-23T00:00:00.000Z',
                readAt: null,
                revision: 1,
                projectionVersion: 1,
                deleted: false,
                deletedAt: null,
              },
              sort: ['2026-07-23T00:00:00.000Z', '22222222-2222-4222-8222-222222222222'],
            },
            {
              source: {
                notificationId: '33333333-3333-4333-8333-333333333333',
                eventId: 'event-3',
                recipientId: '11111111-1111-4111-8111-111111111111',
                scopeType: 'user',
                scopeId: '11111111-1111-4111-8111-111111111111',
                organizationId: null,
                type: 'info',
                schemaVersion: 1,
                category: 'system',
                priority: 'normal',
                state: 'read',
                title: 'Older',
                body: 'Older body',
                relatedEntityType: null,
                relatedEntityId: null,
                action: null,
                metadata: null,
                occurredAt: '2026-07-22T23:00:00.000Z',
                createdAt: '2026-07-22T23:00:00.000Z',
                updatedAt: '2026-07-22T23:10:00.000Z',
                readAt: '2026-07-22T23:10:00.000Z',
                revision: 2,
                projectionVersion: 1,
                deleted: false,
                deletedAt: null,
              },
              sort: ['2026-07-22T23:00:00.000Z', '33333333-3333-4333-8333-333333333333'],
            },
          ],
        })
      },
    }
    const codec = new NotificationFeedCursorCodec({
      secret: 'test-notification-cursor-secret-at-least-32-bytes',
      now: () => new Date('2026-07-23T01:00:00.000Z'),
    })
    const repository = new NotificationSearchFeedRepository({
      transport,
      cursorCodec: codec,
      readAlias: 'suar_notifications_read',
    })
    const after = codec.encode({
      direction: 'after',
      createdAt: '2026-07-23T00:30:00.000Z',
      notificationId: '44444444-4444-4444-8444-444444444444',
      recipientId: '11111111-1111-4111-8111-111111111111',
      unreadOnly: true,
    })

    const page = await repository.findByRecipient({
      recipientId: '11111111-1111-4111-8111-111111111111',
      limit: 1,
      unreadOnly: true,
      after,
    })

    assert.lengthOf(page.data, 1)
    assert.equal(page.data[0]?.id, '22222222-2222-4222-8222-222222222222')
    assert.isTrue(page.hasNextPage)
    assert.isNotNull(page.nextCursor)
    assert.deepEqual(requests, [
      {
        index: 'suar_notifications_read',
        size: 2,
        timeout: '250ms',
        trackTotalHits: false,
        query: {
          bool: {
            filter: [
              { term: { recipientId: '11111111-1111-4111-8111-111111111111' } },
              { term: { deleted: false } },
              { term: { state: 'unread' } },
            ],
          },
        },
        sort: [{ createdAt: 'desc' }, { notificationId: 'desc' }],
        searchAfter: ['2026-07-23T00:30:00.000Z', '44444444-4444-4444-8444-444444444444'],
        sourceFields: [
          'notificationId',
          'eventId',
          'recipientId',
          'scopeType',
          'scopeId',
          'organizationId',
          'type',
          'schemaVersion',
          'category',
          'priority',
          'state',
          'title',
          'body',
          'relatedEntityType',
          'relatedEntityId',
          'action',
          'metadata',
          'occurredAt',
          'createdAt',
          'updatedAt',
          'readAt',
          'revision',
          'projectionVersion',
          'deleted',
          'deletedAt',
        ],
      },
    ])
  })

  test('rejects an invalid cursor instead of silently changing the requested window', async ({
    assert,
  }) => {
    let called = false
    const repository = new NotificationSearchFeedRepository({
      transport: {
        search: () => {
          called = true
          return Promise.resolve({ hits: [] })
        },
      },
      cursorCodec: new NotificationFeedCursorCodec({
        secret: 'test-notification-cursor-secret-at-least-32-bytes',
      }),
      readAlias: 'suar_notifications_read',
    })

    await assert.rejects(() =>
      repository.findByRecipient({
        recipientId: '11111111-1111-4111-8111-111111111111',
        limit: 20,
        unreadOnly: false,
        after: 'tampered',
      })
    )
    assert.isFalse(called)
  })

  test('returns a before window in canonical order without inventing an older previous page', async ({
    assert,
  }) => {
    const requests: unknown[] = []
    const codec = new NotificationFeedCursorCodec({
      secret: 'test-notification-cursor-secret-at-least-32-bytes',
      now: () => new Date('2026-07-23T03:00:00.000Z'),
    })
    const repository = new NotificationSearchFeedRepository({
      transport: {
        search: (request) => {
          requests.push(request)
          return Promise.resolve({
            hits: [
              {
                source: {
                  notificationId: '22222222-2222-4222-8222-222222222222',
                  eventId: 'event-2',
                  recipientId: '11111111-1111-4111-8111-111111111111',
                  scopeType: 'user',
                  scopeId: '11111111-1111-4111-8111-111111111111',
                  organizationId: null,
                  type: 'info',
                  schemaVersion: 1,
                  category: 'system',
                  priority: 'normal',
                  state: 'unread',
                  title: 'Closer newer',
                  body: 'Closer newer body',
                  relatedEntityType: null,
                  relatedEntityId: null,
                  action: null,
                  metadata: null,
                  occurredAt: '2026-07-23T01:00:00.000Z',
                  createdAt: '2026-07-23T01:00:00.000Z',
                  updatedAt: '2026-07-23T01:00:00.000Z',
                  readAt: null,
                  revision: 1,
                  projectionVersion: 1,
                  deleted: false,
                  deletedAt: null,
                },
                sort: ['2026-07-23T01:00:00.000Z', '22222222-2222-4222-8222-222222222222'],
              },
              {
                source: {
                  notificationId: '33333333-3333-4333-8333-333333333333',
                  eventId: 'event-3',
                  recipientId: '11111111-1111-4111-8111-111111111111',
                  scopeType: 'user',
                  scopeId: '11111111-1111-4111-8111-111111111111',
                  organizationId: null,
                  type: 'info',
                  schemaVersion: 1,
                  category: 'system',
                  priority: 'normal',
                  state: 'unread',
                  title: 'Newest',
                  body: 'Newest body',
                  relatedEntityType: null,
                  relatedEntityId: null,
                  action: null,
                  metadata: null,
                  occurredAt: '2026-07-23T02:00:00.000Z',
                  createdAt: '2026-07-23T02:00:00.000Z',
                  updatedAt: '2026-07-23T02:00:00.000Z',
                  readAt: null,
                  revision: 1,
                  projectionVersion: 1,
                  deleted: false,
                  deletedAt: null,
                },
                sort: ['2026-07-23T02:00:00.000Z', '33333333-3333-4333-8333-333333333333'],
              },
            ],
          })
        },
      },
      cursorCodec: codec,
      readAlias: 'suar_notifications_read',
    })
    const before = codec.encode({
      direction: 'before',
      createdAt: '2026-07-23T00:00:00.000Z',
      notificationId: '44444444-4444-4444-8444-444444444444',
      recipientId: '11111111-1111-4111-8111-111111111111',
      unreadOnly: false,
    })

    const page = await repository.findByRecipient({
      recipientId: '11111111-1111-4111-8111-111111111111',
      limit: 2,
      unreadOnly: false,
      before,
    })

    assert.deepEqual(
      page.data.map((notification) => notification.id),
      ['33333333-3333-4333-8333-333333333333', '22222222-2222-4222-8222-222222222222']
    )
    assert.isFalse(page.hasPreviousPage)
    assert.isNull(page.previousCursor)
    assert.isTrue(page.hasNextPage)
    assert.isNotNull(page.nextCursor)
    assert.deepEqual(requests[0], {
      index: 'suar_notifications_read',
      size: 3,
      timeout: '250ms',
      trackTotalHits: false,
      query: {
        bool: {
          filter: [
            { term: { recipientId: '11111111-1111-4111-8111-111111111111' } },
            { term: { deleted: false } },
          ],
        },
      },
      sort: [{ createdAt: 'asc' }, { notificationId: 'asc' }],
      searchAfter: ['2026-07-23T00:00:00.000Z', '44444444-4444-4444-8444-444444444444'],
      sourceFields: [
        'notificationId',
        'eventId',
        'recipientId',
        'scopeType',
        'scopeId',
        'organizationId',
        'type',
        'schemaVersion',
        'category',
        'priority',
        'state',
        'title',
        'body',
        'relatedEntityType',
        'relatedEntityId',
        'action',
        'metadata',
        'occurredAt',
        'createdAt',
        'updatedAt',
        'readAt',
        'revision',
        'projectionVersion',
        'deleted',
        'deletedAt',
      ],
    })
  })
})
