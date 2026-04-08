import { test } from '@japa/runner'

import { NotificationProjectionReconciliationExecutor } from '#modules/notifications/infra/search/notification_projection_reconciliation_executor'
import type { NotificationSearchDocument } from '#modules/notifications/infra/search/notification_search_index_repository'

function document(id: string, revision: number): NotificationSearchDocument {
  return {
    notificationId: id,
    eventId: `event-${id}`,
    recipientId: 'recipient-1',
    scopeType: 'user',
    scopeId: 'recipient-1',
    organizationId: null,
    type: 'info',
    schemaVersion: 1,
    category: 'system',
    priority: 'normal',
    state: 'unread',
    title: id,
    body: id,
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

async function* values<T>(items: T[]): AsyncGenerator<T> {
  await Promise.resolve()
  for (const item of items) {
    yield item
  }
}

test.group('Unit | Notification Projection Reconciliation Executor', () => {
  test('repairs missing and stale documents but never overwrites a newer projection', async ({
    assert,
  }) => {
    const writes: NotificationSearchDocument[][] = []
    const records: unknown[] = []
    const reconciler = new NotificationProjectionReconciliationExecutor({
      expected: {
        expectedDocuments: () => values([document('a', 2), document('b', 3), document('c', 4)]),
        setStatus: () => Promise.resolve(),
        recordReconciliation: (input) => {
          records.push(input)
          return Promise.resolve()
        },
      },
      actual: {
        refresh: () => Promise.resolve(),
        scanRevisions: () =>
          values([
            { notificationId: 'b', revision: 2, deleted: false },
            { notificationId: 'c', revision: 5, deleted: false },
          ]),
      },
      writer: {
        projectMany: (_index, documents) => {
          writes.push(documents)
          return Promise.resolve({
            appliedIds: documents.map((item) => item.notificationId),
            staleIds: [],
            failures: [],
          })
        },
        purgeMany: () => Promise.resolve({ appliedIds: [], failures: [] }),
      },
      batchSize: 100,
    })

    const report = await reconciler.reconcile(
      {
        id: 'run-1',
        status: 'reconciling',
        targetId: 'target-1',
        sourceTargetId: 'source-1',
        targetIndex: 'notifications-v2',
        sourceIndex: 'notifications-v1',
        s0Sequence: 10,
        s1Sequence: 20,
        lastNotificationId: null,
        lastTombstoneId: null,
        scannedCount: 0,
        projectedCount: 0,
      },
      { repair: true }
    )

    assert.deepEqual(
      writes.flat().map((item) => item.notificationId),
      ['a', 'b']
    )
    assert.deepEqual(
      {
        missing: report.missing,
        stale: report.stale,
        extra: report.extra,
        ahead: report.ahead,
        repaired: report.repaired,
        passed: report.passed,
      },
      {
        missing: 1,
        stale: 1,
        extra: 0,
        ahead: 1,
        repaired: 2,
        passed: false,
      }
    )
    assert.lengthOf(records, 1)
  })

  test('repairs an extra projected id through a bounded physical purge', async ({ assert }) => {
    let writes = 0
    const purges: string[][] = []
    const reconciler = new NotificationProjectionReconciliationExecutor({
      expected: {
        expectedDocuments: () => values([]),
        setStatus: () => Promise.resolve(),
        recordReconciliation: () => Promise.resolve(),
      },
      actual: {
        refresh: () => Promise.resolve(),
        scanRevisions: () => values([{ notificationId: 'extra', revision: 9, deleted: false }]),
      },
      writer: {
        projectMany: () => {
          writes += 1
          return Promise.resolve({ appliedIds: [], staleIds: [], failures: [] })
        },
        purgeMany: (_index, ids) => {
          purges.push(ids)
          return Promise.resolve({ appliedIds: ids, failures: [] })
        },
      },
    })

    const report = await reconciler.reconcile(
      {
        id: 'run-2',
        status: 'reconciling',
        targetId: 'target-2',
        sourceTargetId: 'source-1',
        targetIndex: 'notifications-v2',
        sourceIndex: 'notifications-v1',
        s0Sequence: 10,
        s1Sequence: 20,
        lastNotificationId: null,
        lastTombstoneId: null,
        scannedCount: 0,
        projectedCount: 0,
      },
      { repair: true }
    )

    assert.equal(report.extra, 1)
    assert.isFalse(report.passed)
    assert.equal(report.repaired, 1)
    assert.equal(writes, 0)
    assert.deepEqual(purges, [['extra']])
  })

  test('blocks reconciliation when Elasticsearch is ahead of canonical revision', async ({
    assert,
  }) => {
    const reconciler = new NotificationProjectionReconciliationExecutor({
      expected: {
        expectedDocuments: () => values([document('ahead', 4)]),
        setStatus: () => Promise.resolve(),
        recordReconciliation: () => Promise.resolve(),
      },
      actual: {
        refresh: () => Promise.resolve(),
        scanRevisions: () => values([{ notificationId: 'ahead', revision: 5, deleted: false }]),
      },
      writer: {
        projectMany: () => Promise.resolve({ appliedIds: [], staleIds: [], failures: [] }),
        purgeMany: () => Promise.resolve({ appliedIds: [], failures: [] }),
      },
    })

    const report = await reconciler.reconcile(
      {
        id: 'run-ahead',
        status: 'reconciling',
        targetId: 'target-ahead',
        sourceTargetId: null,
        targetIndex: 'notifications-v2',
        sourceIndex: null,
        s0Sequence: 10,
        s1Sequence: 20,
        lastNotificationId: null,
        lastTombstoneId: null,
        scannedCount: 0,
        projectedCount: 0,
      },
      { repair: true }
    )

    assert.equal(report.ahead, 1)
    assert.isFalse(report.passed)
  })
})
