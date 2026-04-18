import { test } from '@japa/runner'

import {
  handleUserAccountLifecycleChanged,
  handleUserProfileChanged,
} from '#modules/search/listeners/search_reindex_listener'

const controller = new AbortController()
const accountEvent = {
  eventId: 'ed546f74-67a4-54db-9469-1b27d5d6f607',
  action: 'deactivated' as const,
  userId: 'user-1',
  actorId: 'admin-1',
  occurredAt: '2026-07-26T10:00:00.000Z',
  deliveryContext: {
    signal: controller.signal,
    sequence: 101,
  },
}

test.group('User lifecycle durable search listener', () => {
  test('delivers both projections with one abortable version fence', async ({
    assert,
  }) => {
    const calls: Array<{ target: string; context: unknown }> = []
    await handleUserAccountLifecycleChanged(accountEvent, {
      reindexUserDirectoryDocumentFenced: (_userId, context) => {
        calls.push({ target: 'directory', context })
        return Promise.resolve()
      },
      reindexTalentDocumentFenced: (_userId, context) => {
        calls.push({ target: 'talent', context })
        return Promise.resolve()
      },
    })

    assert.deepEqual(
      calls.map((call) => call.target),
      ['directory', 'talent']
    )
    assert.deepEqual(calls[0]?.context, {
      signal: controller.signal,
      externalVersion: 101,
      tombstoneAt: accountEvent.occurredAt,
    })
  })

  test('retries the composite event when the second projection fails', async ({
    assert,
  }) => {
    let directoryCalls = 0
    let captured: unknown
    try {
      await handleUserProfileChanged(
        {
          eventId: '224bf40f-56dd-5f8d-ac6d-7cab66fbca77',
          userId: 'user-1',
          actorId: 'user-1',
          changedFields: ['bio'],
          occurredAt: '2026-07-26T10:01:00.000Z',
          deliveryContext: {
            signal: controller.signal,
            sequence: 102,
          },
        },
        {
          reindexUserDirectoryDocumentFenced: () => {
            directoryCalls += 1
            return Promise.resolve()
          },
          reindexTalentDocumentFenced: () =>
            Promise.reject({ meta: { statusCode: 503 } }),
        }
      )
    } catch (error) {
      captured = error
    }

    assert.equal(directoryCalls, 1)
    assert.equal(
      (captured as { errorCode?: string }).errorCode,
      'SEARCH_PROJECTION_TRANSIENT_FAILURE'
    )
    assert.isTrue((captured as { retryable?: boolean }).retryable)
  })

  test('acks configured-disabled search and rejects an unfenced delivery', async ({
    assert,
  }) => {
    let calls = 0
    const dependencies = {
      isSearchEnabled: () => false,
      reindexUserDirectoryDocumentFenced: () => {
        calls += 1
        return Promise.resolve()
      },
      reindexTalentDocumentFenced: () => {
        calls += 1
        return Promise.resolve()
      },
    }
    await handleUserAccountLifecycleChanged(accountEvent, dependencies)
    assert.equal(calls, 0)
    const { deliveryContext: _deliveryContext, ...unfencedEvent } = accountEvent

    await assert.rejects(
      () =>
        handleUserAccountLifecycleChanged(
          unfencedEvent,
          {
            ...dependencies,
            isSearchEnabled: () => true,
          }
        ),
      /USER_SEARCH_PROJECTION_DELIVERY_CONTEXT_MISSING/
    )
  })
})
