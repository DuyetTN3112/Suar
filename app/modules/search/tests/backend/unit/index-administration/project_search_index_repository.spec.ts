import { test } from '@japa/runner'

import { ProjectSearchIndexRepository } from '#modules/search/infra/repositories/entity-search/projects/project_search_index_repository'

const document = {
  project_id: 'project-1',
  name: 'Enterprise Platform',
  description: null,
  visibility: 'team' as const,
  status: 'active',
  organization_id: 'org-1',
  creator_id: 'user-1',
  manager_id: null,
  owner_id: 'user-1',
  tags_text: 'platform',
  deleted_at: null,
  updated_at: '2026-07-26T10:00:00.000Z',
}

test.group('Project search index repository fencing', () => {
  test('keeps index lifecycle checks out of the search hot path', async ({ assert }) => {
    let existsCalls = 0
    const searchCalls: unknown[] = []
    const client = {
      indices: {
        exists: () => {
          existsCalls += 1
          return Promise.resolve(true)
        },
      },
      search: (params: unknown) => {
        searchCalls.push(params)
        return Promise.resolve({
          hits: {
            hits: [
              {
                _source: { project_id: document.project_id },
                _score: 7,
              },
            ],
          },
        })
      },
    }
    const repository = new ProjectSearchIndexRepository(
      client as unknown as ConstructorParameters<typeof ProjectSearchIndexRepository>[0]
    )

    const hits = await repository.search({ q: 'enterprise platform', limit: 5 })

    assert.equal(existsCalls, 0)
    assert.lengthOf(searchCalls, 1)
    assert.deepEqual(hits, [{ projectId: document.project_id, score: 7 }])
  })

  test('passes abort signal and external version to upsert and delete requests', async ({
    assert,
  }) => {
    const indexCalls: Array<{ params: unknown; options: unknown }> = []
    const deleteCalls: Array<{ params: unknown; options: unknown }> = []
    const client = {
      indices: {
        existsAlias: () => Promise.resolve(true),
        exists: () => Promise.resolve(true),
        create: () => Promise.resolve(),
        delete: () => Promise.resolve(),
      },
      index: (params: unknown, options: unknown) => {
        indexCalls.push({ params, options })
        return Promise.resolve()
      },
      delete: (params: unknown, options: unknown) => {
        deleteCalls.push({ params, options })
        return Promise.resolve()
      },
    }
    const repository = new ProjectSearchIndexRepository(
      client as unknown as ConstructorParameters<typeof ProjectSearchIndexRepository>[0]
    )
    const controller = new AbortController()
    const context = {
      signal: controller.signal,
      externalVersion: 73,
      tombstoneAt: '2026-07-26T10:00:00.000Z',
    }

    await repository.upsertDocument(document, context)
    await repository.deleteDocument(document.project_id, context)

    assert.include(indexCalls[0]?.params, {
      id: document.project_id,
      version: 73,
      version_type: 'external_gte',
    })
    assert.deepEqual(indexCalls[0]?.options, { signal: controller.signal })
    assert.include(indexCalls[1]?.params, {
      id: document.project_id,
      version: 73,
      version_type: 'external_gte',
    })
    assert.deepInclude(indexCalls[1]?.params, {
      document: {
        project_id: document.project_id,
        deleted_at: context.tombstoneAt,
      },
    })
    assert.deepEqual(indexCalls[1]?.options, { signal: controller.signal })
    assert.lengthOf(deleteCalls, 0)
  })

  test('does not start an Elasticsearch request after cancellation', async ({ assert }) => {
    let calls = 0
    const client = {
      indices: {
        exists: () => {
          calls += 1
          return Promise.resolve(true)
        },
      },
    }
    const repository = new ProjectSearchIndexRepository(
      client as unknown as ConstructorParameters<typeof ProjectSearchIndexRepository>[0]
    )
    const controller = new AbortController()
    controller.abort(new Error('lease lost'))

    await assert.rejects(
      () =>
        repository.upsertDocument(document, {
          signal: controller.signal,
          externalVersion: 74,
        }),
      /lease lost/
    )
    assert.equal(calls, 0)
  })

  test('rejects unsafe fencing versions before contacting Elasticsearch', async ({ assert }) => {
    let calls = 0
    const client = {
      indices: {
        exists: () => {
          calls += 1
          return Promise.resolve(true)
        },
      },
    }
    const repository = new ProjectSearchIndexRepository(
      client as unknown as ConstructorParameters<typeof ProjectSearchIndexRepository>[0]
    )

    await assert.rejects(
      () =>
        repository.deleteDocument('project-1', {
          externalVersion: 0,
          tombstoneAt: '2026-07-26T10:00:00.000Z',
        }),
      /positive safe integer/
    )
    assert.equal(calls, 0)
  })

  test('requires a timestamp for a durable deletion fence', async ({ assert }) => {
    const client = {}
    const repository = new ProjectSearchIndexRepository(
      client as unknown as ConstructorParameters<typeof ProjectSearchIndexRepository>[0]
    )

    await assert.rejects(
      () => repository.deleteDocument('project-1', { externalVersion: 75 }),
      /requires an ISO tombstone timestamp/
    )
  })

  test('treats a concurrent index creator as successful convergence', async () => {
    let aliasProbeCount = 0
    const client = {
      indices: {
        existsAlias: () => {
          aliasProbeCount += 1
          return Promise.resolve(aliasProbeCount > 1)
        },
        exists: () => Promise.resolve(false),
        create: () =>
          Promise.reject({
            meta: {
              body: {
                error: { type: 'resource_already_exists_exception' },
              },
            },
          }),
      },
    }
    const repository = new ProjectSearchIndexRepository(
      client as unknown as ConstructorParameters<typeof ProjectSearchIndexRepository>[0]
    )

    await repository.ensureIndex()
  })
})
