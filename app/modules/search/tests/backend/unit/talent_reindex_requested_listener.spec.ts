import { test } from '@japa/runner'

import { handleTalentReindexRequested } from '#modules/search/listeners/search_reindex_listener'

const event = {
  userId: 'talent-user-1',
  sourceEventName: 'review:confirmed' as const,
  sourceEventId: 'confirmation-1',
}

test.group('Talent reindex requested listener', () => {
  test('uses strict projection delivery and propagates Elasticsearch failure', async ({
    assert,
  }) => {
    await assert.rejects(
      () =>
        handleTalentReindexRequested(event, {
          reindexTalentDocument: () => Promise.reject(new Error('search projection unavailable')),
        }),
      'SEARCH_PROJECTION_TRANSIENT_FAILURE'
    )
  })

  test('honors delivery cancellation before calling the projection', async ({ assert }) => {
    const controller = new AbortController()
    controller.abort(new Error('domain event lease lost'))
    let calls = 0
    await assert.rejects(
      () =>
        handleTalentReindexRequested(
          {
            ...event,
            deliveryContext: { signal: controller.signal, sequence: 41 },
          },
          {
            reindexTalentDocument: () => {
              calls += 1
              return Promise.resolve()
            },
          }
        ),
      'domain event lease lost'
    )
    assert.equal(calls, 0)
  })

  test('acknowledges without projection while search runtime is intentionally disabled', async ({
    assert,
  }) => {
    let calls = 0

    await handleTalentReindexRequested(event, {
      isSearchEnabled: () => false,
      reindexTalentDocument: () => {
        calls += 1
        return Promise.resolve()
      },
    })
    assert.equal(calls, 0)
  })

  test('completes only after strict projection delivery succeeds', async ({ assert }) => {
    const delivered: string[] = []
    await handleTalentReindexRequested(event, {
      reindexTalentDocument: (userId) => {
        delivered.push(userId)
        return Promise.resolve()
      },
    })
    assert.deepEqual(delivered, [event.userId])
  })

  test('passes the durable delivery signal into the active projection', async ({ assert }) => {
    const controller = new AbortController()
    let observedSignal: AbortSignal | undefined
    let observedExternalVersion: number | undefined

    await handleTalentReindexRequested(
      {
        ...event,
        deliveryContext: { signal: controller.signal, sequence: 42 },
      },
      {
        reindexTalentDocument: () => Promise.resolve(),
        reindexTalentDocumentFenced: (_userId, context) => {
          observedSignal = context.signal
          observedExternalVersion = context.externalVersion
          return Promise.resolve()
        },
      }
    )

    assert.strictEqual(observedSignal, controller.signal)
    assert.equal(observedExternalVersion, 42)
  })
})
