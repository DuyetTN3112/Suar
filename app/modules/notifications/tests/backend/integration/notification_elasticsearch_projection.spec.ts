import { randomUUID } from 'node:crypto'

import { test } from '@japa/runner'

import { buildSearchIndexName } from '#config/search'
import { NotificationProjectionAdminRepository } from '#modules/notifications/infra/repositories/notification-observability/notification_projection_admin_repository'
import { NotificationSearchFeedRepository } from '#modules/notifications/infra/repositories/notification-feed/notification_search_feed_repository'
import {
  NotificationSearchIndexRepository,
  type ActiveNotificationSearchDocument,
  type NotificationSearchDocument,
} from '#modules/notifications/infra/repositories/notification-observability/notification_search_index_repository'
import { NotificationFeedCursorCodec } from '#modules/notifications/infra/adapters/notification-feed/notification_feed_cursor_codec'
import { searchClient } from '#platform/search/elasticsearch_client'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'

function activeDocument(input: {
  notificationId: string
  recipientId: string
  revision: number
  createdAt: string
  state?: 'read' | 'unread'
}): ActiveNotificationSearchDocument {
  return {
    notificationId: input.notificationId,
    eventId: randomUUID(),
    recipientId: input.recipientId,
    scopeType: 'user',
    scopeId: input.recipientId,
    organizationId: null,
    type: 'info',
    schemaVersion: 1,
    category: 'system',
    priority: 'normal',
    state: input.state ?? 'unread',
    title: `Notification ${input.notificationId}`,
    body: 'Elasticsearch integration projection',
    relatedEntityType: null,
    relatedEntityId: null,
    action: null,
    metadata: null,
    occurredAt: input.createdAt,
    createdAt: input.createdAt,
    updatedAt: input.createdAt,
    readAt: null,
    revision: input.revision,
    projectionVersion: 1,
    deleted: false,
    deletedAt: null,
  }
}

test.group('Integration | Notification Elasticsearch projection', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())

  test('enforces aliases, external revisions, recipient isolation, cursors, and tombstones', async ({
    assert,
    cleanup,
  }) => {
    const suffix = randomUUID().replaceAll('-', '')
    const physicalIndex = buildSearchIndexName(`notification_it_${suffix}`)
    const readAlias = buildSearchIndexName(`notification_it_read_${suffix}`)
    const writeAlias = buildSearchIndexName(`notification_it_write_${suffix}`)
    cleanup(async () => {
      if (await searchClient.indices.exists({ index: physicalIndex })) {
        await searchClient.indices.delete({ index: physicalIndex })
      }
    })

    const index = new NotificationSearchIndexRepository()
    const admin = new NotificationProjectionAdminRepository()
    const recipientId = randomUUID()
    const otherRecipientId = randomUUID()
    const latestId = randomUUID()
    const olderId = randomUUID()
    const isolatedId = randomUUID()
    const codec = new NotificationFeedCursorCodec({
      secret: 'notification-elasticsearch-integration-secret-32-bytes',
    })
    const feed = new NotificationSearchFeedRepository({
      cursorCodec: codec,
      readAlias,
    })

    await index.ensureIndex({ physicalIndex, readAlias, writeAlias })
    assert.deepEqual(await admin.aliasIndices(readAlias), [physicalIndex])
    assert.deepEqual(await admin.aliasIndices(writeAlias), [physicalIndex])

    const projected = await index.projectMany(physicalIndex, [
      activeDocument({
        notificationId: latestId,
        recipientId,
        revision: 2,
        createdAt: '2026-07-24T02:00:00.000Z',
      }),
      activeDocument({
        notificationId: olderId,
        recipientId,
        revision: 1,
        createdAt: '2026-07-24T01:00:00.000Z',
      }),
      activeDocument({
        notificationId: isolatedId,
        recipientId: otherRecipientId,
        revision: 1,
        createdAt: '2026-07-24T03:00:00.000Z',
      }),
    ])
    assert.sameMembers(projected.appliedIds, [latestId, olderId, isolatedId])
    assert.isEmpty(projected.failures)
    await admin.refresh(physicalIndex)

    const first = await feed.findByRecipient({
      recipientId,
      limit: 1,
      unreadOnly: false,
    })
    assert.deepEqual(
      first.data.map((notification) => notification.id),
      [latestId]
    )
    assert.isTrue(first.hasNextPage)
    assert.isNotNull(first.nextCursor)

    const second = await feed.findByRecipient({
      recipientId,
      limit: 1,
      unreadOnly: false,
      after: first.nextCursor,
    })
    assert.deepEqual(
      second.data.map((notification) => notification.id),
      [olderId]
    )
    assert.isFalse(second.hasNextPage)
    assert.isTrue(second.hasPreviousPage)

    const stale = await index.projectMany(physicalIndex, [
      activeDocument({
        notificationId: latestId,
        recipientId,
        revision: 1,
        createdAt: '2026-07-24T02:00:00.000Z',
      }),
    ])
    assert.deepEqual(stale.staleIds, [latestId])
    assert.isEmpty(stale.failures)

    const tombstone: NotificationSearchDocument = {
      notificationId: latestId,
      recipientId,
      revision: 3,
      projectionVersion: 1,
      deleted: true,
      deletedAt: '2026-07-24T04:00:00.000Z',
    }
    const deleted = await index.projectMany(physicalIndex, [tombstone])
    assert.deepEqual(deleted.appliedIds, [latestId])
    await admin.refresh(physicalIndex)

    const afterDelete = await feed.findByRecipient({
      recipientId,
      limit: 20,
      unreadOnly: false,
    })
    assert.deepEqual(
      afterDelete.data.map((notification) => notification.id),
      [olderId]
    )

    const invalidDocument = {
      ...activeDocument({
        notificationId: latestId,
        recipientId,
        revision: 4,
        createdAt: '2026-07-24T05:00:00.000Z',
      }),
      unexpectedField: 'strict mapping must reject this',
    } as unknown as NotificationSearchDocument
    const strictMapping = await index.projectMany(physicalIndex, [invalidDocument])
    assert.lengthOf(strictMapping.failures, 1)
    assert.isFalse(strictMapping.failures[0]?.retryable)
    assert.equal(strictMapping.failures[0]?.errorClass, 'strict_dynamic_mapping_exception')
  }).timeout(15_000)
})
