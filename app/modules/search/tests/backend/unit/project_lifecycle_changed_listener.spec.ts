import { test } from '@japa/runner'

import { handleProjectLifecycleChanged } from '#modules/search/listeners/search_reindex_listener'

const baseEvent = {
  eventId: '4bb40a33-f683-5c80-a178-c46af83f17ab',
  action: 'updated' as const,
  projectId: 'project-1',
  organizationId: 'org-1',
  actorId: 'user-1',
  projectName: null,
  occurredAt: '2026-07-26T10:00:00.000Z',
}

test.group('Project lifecycle durable search listener', () => {
  test('uses strict upsert and propagates search dependency failures', async ({
    assert,
  }) => {
    await assert.rejects(
      () =>
        handleProjectLifecycleChanged(baseEvent, {
          reindexProjectDocument: () =>
            Promise.reject(new Error('project search unavailable')),
          removeProjectDocument: () => Promise.resolve(),
        }),
      /SEARCH_PROJECTION_TRANSIENT_FAILURE/
    )
  })

  test('uses strict delete for deleted projects', async ({ assert }) => {
    const operations: string[] = []
    let observedVersion: number | undefined
    let observedTombstoneAt: string | undefined
    const controller = new AbortController()
    await handleProjectLifecycleChanged(
      {
        ...baseEvent,
        action: 'deleted',
        deliveryContext: { signal: controller.signal, sequence: 73 },
      },
      {
        reindexProjectDocument: (projectId) => {
          operations.push(`upsert:${projectId}`)
          return Promise.resolve()
        },
        removeProjectDocument: (projectId, context) => {
          assert.strictEqual(context?.signal, controller.signal)
          observedVersion = context?.externalVersion
          observedTombstoneAt = context?.tombstoneAt
          operations.push(`delete:${projectId}`)
          return Promise.resolve()
        },
      }
    )
    assert.deepEqual(operations, ['delete:project-1'])
    assert.equal(observedVersion, 73)
    assert.equal(observedTombstoneAt, baseEvent.occurredAt)
  })

  test('classifies rejected search requests as permanent safe failures', async ({
    assert,
  }) => {
    let captured: unknown
    try {
      await handleProjectLifecycleChanged(baseEvent, {
        reindexProjectDocument: () =>
          Promise.reject({ meta: { statusCode: 403 }, message: 'secret upstream detail' }),
        removeProjectDocument: () => Promise.resolve(),
      })
    } catch (error) {
      captured = error
    }

    assert.equal(
      (captured as { errorCode?: string }).errorCode,
      'SEARCH_PROJECTION_AUTHORIZATION_REJECTED'
    )
    assert.isFalse((captured as { retryable?: boolean }).retryable)
  })

  test('acknowledges without projection when search is disabled and honors aborts', async ({
    assert,
  }) => {
    let calls = 0
    const dependencies = {
      isSearchEnabled: () => false,
      reindexProjectDocument: () => {
        calls += 1
        return Promise.resolve()
      },
      removeProjectDocument: () => {
        calls += 1
        return Promise.resolve()
      },
    }
    await handleProjectLifecycleChanged(baseEvent, dependencies)

    const controller = new AbortController()
    controller.abort(new Error('lease lost'))
    await assert.rejects(
      () =>
        handleProjectLifecycleChanged(
          {
            ...baseEvent,
            deliveryContext: { signal: controller.signal, sequence: 41 },
          },
          { ...dependencies, isSearchEnabled: () => true }
        ),
      /lease lost/
    )
    assert.equal(calls, 0)
  })
})
