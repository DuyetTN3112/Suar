import { errors as elasticsearchErrors } from '@elastic/elasticsearch'
import { test } from '@japa/runner'

import {
  isNotificationAliasNotFoundError,
  NotificationProjectionAdminRepository,
  type NotificationProjectionAdminTransport,
} from '#modules/notifications/infra/search/notification_projection_admin_repository'
import { NOTIFICATION_SEARCH_MAPPING } from '#modules/notifications/infra/search/notification_search_index_repository'

function transport(
  overrides: Partial<NotificationProjectionAdminTransport> = {}
): NotificationProjectionAdminTransport {
  return {
    indexExists: () => Promise.resolve(false),
    createIndex: () => Promise.resolve(),
    refresh: () => Promise.resolve(),
    deleteIndex: () => Promise.resolve(),
    updateAliases: () => Promise.resolve(),
    getAliasIndices: () => Promise.resolve([]),
    openPointInTime: () => Promise.resolve('pit-1'),
    searchPointInTime: () => Promise.resolve({ pitId: 'pit-1', hits: [] }),
    closePointInTime: () => Promise.resolve(),
    ...overrides,
  }
}

function elasticsearchResponseError(statusCode: number): elasticsearchErrors.ResponseError {
  const responseError = Object.create(
    elasticsearchErrors.ResponseError.prototype
  ) as elasticsearchErrors.ResponseError
  Object.defineProperty(responseError, 'meta', {
    value: { statusCode },
  })
  return responseError
}

test.group('Unit | Notification Projection Admin Repository', () => {
  test('accepts only an official Elasticsearch 404 response as alias absence', ({ assert }) => {
    assert.isTrue(isNotificationAliasNotFoundError(elasticsearchResponseError(404)))
    assert.isFalse(isNotificationAliasNotFoundError({ statusCode: 404 }))
    assert.isFalse(isNotificationAliasNotFoundError(new Error('dependency unavailable')))
  })

  test('creates a strict physical index without attaching live aliases', async ({ assert }) => {
    const creates: unknown[] = []
    const repository = new NotificationProjectionAdminRepository(
      transport({
        createIndex: (input) => {
          creates.push(input)
          return Promise.resolve()
        },
      })
    )

    await repository.ensurePhysicalIndex('suar_notifications_feed_v000002')

    assert.deepEqual(creates, [
      {
        index: 'suar_notifications_feed_v000002',
        mappings: NOTIFICATION_SEARCH_MAPPING,
      },
    ])
  })

  test('swaps read and write aliases in one all-or-nothing request', async ({ assert }) => {
    const requests: unknown[] = []
    const repository = new NotificationProjectionAdminRepository(
      transport({
        updateAliases: (input) => {
          requests.push(input)
          return Promise.resolve()
        },
      })
    )

    await repository.swapAliases({
      sourceIndex: 'suar_notifications_feed_v000001',
      targetIndex: 'suar_notifications_feed_v000002',
      readAlias: 'suar_notifications_read',
      writeAlias: 'suar_notifications_write',
    })

    assert.deepEqual(requests, [
      {
        actions: [
          {
            remove: {
              index: 'suar_notifications_feed_v000001',
              alias: 'suar_notifications_read',
              mustExist: true,
            },
          },
          {
            remove: {
              index: 'suar_notifications_feed_v000001',
              alias: 'suar_notifications_write',
              mustExist: true,
            },
          },
          {
            add: {
              index: 'suar_notifications_feed_v000002',
              alias: 'suar_notifications_read',
            },
          },
          {
            add: {
              index: 'suar_notifications_feed_v000002',
              alias: 'suar_notifications_write',
              isWriteIndex: true,
            },
          },
        ],
      },
    ])
  })

  test('deletes an exact physical index idempotently', async ({ assert }) => {
    let attempts = 0
    const repository = new NotificationProjectionAdminRepository(
      transport({
        deleteIndex: () => {
          attempts += 1
          return attempts === 1
            ? Promise.resolve()
            : Promise.reject(elasticsearchResponseError(404))
        },
      })
    )

    await repository.deletePhysicalIndex('suar_notifications_feed_v000001')
    await repository.deletePhysicalIndex('suar_notifications_feed_v000001')

    assert.equal(attempts, 2)
  })

  test('does not hide a physical index deletion dependency failure', async ({ assert }) => {
    const dependencyFailure = elasticsearchResponseError(503)
    const repository = new NotificationProjectionAdminRepository(
      transport({
        deleteIndex: () => Promise.reject(dependencyFailure),
      })
    )

    let caught: unknown
    try {
      await repository.deletePhysicalIndex('suar_notifications_feed_v000001')
    } catch (error) {
      caught = error
    }
    assert.strictEqual(caught, dependencyFailure)
  })

  test('scans revision state through PIT and always closes the latest PIT id', async ({
    assert,
  }) => {
    const searches: unknown[] = []
    const closed: string[] = []
    let page = 0
    const repository = new NotificationProjectionAdminRepository(
      transport({
        searchPointInTime: (input) => {
          searches.push(input)
          page += 1
          if (page === 1) {
            return Promise.resolve({
              pitId: 'pit-2',
              hits: [
                {
                  source: { notificationId: 'a', revision: 2, deleted: false },
                  sort: ['a'],
                },
              ],
            })
          }
          return Promise.resolve({ pitId: 'pit-3', hits: [] })
        },
        closePointInTime: (pitId) => {
          closed.push(pitId)
          return Promise.resolve()
        },
      })
    )

    const rows = []
    for await (const row of repository.scanRevisions('suar_notifications_feed_v000002', 100)) {
      rows.push(row)
    }

    assert.deepEqual(rows, [{ notificationId: 'a', revision: 2, deleted: false }])
    assert.deepEqual(searches, [
      { pitId: 'pit-1', size: 100, searchAfter: null },
      { pitId: 'pit-2', size: 100, searchAfter: ['a'] },
    ])
    assert.deepEqual(closed, ['pit-3'])
  })
})
