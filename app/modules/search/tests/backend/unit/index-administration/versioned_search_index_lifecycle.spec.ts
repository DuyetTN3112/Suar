import type { Client } from '@elastic/elasticsearch'
import { test } from '@japa/runner'

import { buildSearchGenerationIndexName } from '#modules/search/infra/adapters/index-administration/search_index_names'
import {
  SearchIndexLifecycleError,
  VersionedSearchIndexLifecycle,
} from '#modules/search/infra/adapters/index-administration/versioned_search_index_lifecycle'

const definition = {
  mappings: {
    dynamic: 'strict' as const,
    properties: {
      entity_id: { type: 'keyword' as const },
    },
  },
}

test.group('Versioned search index lifecycle', () => {
  test('creates the initial physical index and stable write alias atomically', async ({
    assert,
  }) => {
    let createRequest: Record<string, unknown> | undefined
    const client = {
      indices: {
        existsAlias: () => Promise.resolve(false),
        exists: () => Promise.resolve(false),
        create: (request: Record<string, unknown>) => {
          createRequest = request
          return Promise.resolve({ acknowledged: true })
        },
      },
    } as unknown as Client
    const lifecycle = new VersionedSearchIndexLifecycle(
      client,
      'suar_test_tasks',
      'suar_test_tasks_v1'
    )

    await lifecycle.ensureIndex(definition)

    assert.equal(createRequest?.['index'], 'suar_test_tasks_v1')
    assert.deepEqual(createRequest?.['aliases'], {
      suar_test_tasks: { is_write_index: true },
    })
  })

  test('adopts a legacy v1 physical index without deleting or copying data', async ({ assert }) => {
    let aliasProbeCount = 0
    let updateRequest: Record<string, unknown> | undefined
    let created = false
    const client = {
      indices: {
        existsAlias: () => {
          aliasProbeCount += 1
          return Promise.resolve(false)
        },
        exists: () => Promise.resolve(true),
        create: () => {
          created = true
          return Promise.resolve({ acknowledged: true })
        },
        updateAliases: (request: Record<string, unknown>) => {
          updateRequest = request
          return Promise.resolve({ acknowledged: true })
        },
      },
    } as unknown as Client
    const lifecycle = new VersionedSearchIndexLifecycle(
      client,
      'suar_test_users',
      'suar_test_users_v1'
    )

    await lifecycle.ensureIndex(definition)

    assert.isFalse(created)
    assert.equal(aliasProbeCount, 2)
    assert.deepEqual(updateRequest?.['actions'], [
      {
        add: {
          index: 'suar_test_users_v1',
          alias: 'suar_test_users',
          is_write_index: true,
        },
      },
    ])
  })

  test('promotes a populated generation with one atomic alias operation', async ({ assert }) => {
    let updateRequest: Record<string, unknown> | undefined
    let activeIndexName = 'suar_test_projects_v1'
    const client = {
      indices: {
        exists: () => Promise.resolve(true),
        existsAlias: () => Promise.resolve(true),
        getAlias: () =>
          Promise.resolve({
            [activeIndexName]: { aliases: {} },
          }),
        updateAliases: (request: Record<string, unknown>) => {
          updateRequest = request
          activeIndexName = 'suar_test_projects_v1_20260726t163940'
          return Promise.resolve({ acknowledged: true })
        },
      },
    } as unknown as Client
    const lifecycle = new VersionedSearchIndexLifecycle(
      client,
      'suar_test_projects',
      'suar_test_projects_v1'
    )
    const nextGeneration = buildSearchGenerationIndexName('suar_test_projects', '20260726t163940')

    await lifecycle.activateGeneration(nextGeneration)

    assert.deepEqual(updateRequest?.['actions'], [
      {
        remove: {
          index: 'suar_test_projects_v1',
          alias: 'suar_test_projects',
          must_exist: true,
        },
      },
      {
        add: {
          index: 'suar_test_projects_v1_20260726t163940',
          alias: 'suar_test_projects',
          is_write_index: true,
        },
      },
    ])
  })

  test('reconciles multiple owned alias backings in one atomic cutover to one generation', async ({ assert }) => {
    let updateRequest: Record<string, unknown> | undefined
    let activeIndexName = 'suar_test_tasks_v1'
    const client = {
      indices: {
        exists: () => Promise.resolve(true),
        existsAlias: () => Promise.resolve(true),
        getAlias: () => Promise.resolve(activeIndexName === 'suar_test_tasks_v1'
          ? {
              suar_test_tasks_v1: { aliases: {} },
              suar_test_tasks_v1_old: { aliases: {} },
            }
          : { [activeIndexName]: { aliases: {} } }),
        updateAliases: (request: Record<string, unknown>) => {
          updateRequest = request
          activeIndexName = 'suar_test_tasks_v1_20260809t000011'
          return Promise.resolve({ acknowledged: true })
        },
      },
    } as unknown as Client
    const lifecycle = new VersionedSearchIndexLifecycle(client, 'suar_test_tasks', 'suar_test_tasks_v1')

    await lifecycle.reconcileAliasToGeneration('suar_test_tasks_v1_20260809t000011', [
      'suar_test_tasks_v1',
      'suar_test_tasks_v1_old',
    ])

    assert.deepEqual(updateRequest?.['actions'], [
      { remove: { index: 'suar_test_tasks_v1', alias: 'suar_test_tasks', must_exist: true } },
      { remove: { index: 'suar_test_tasks_v1_old', alias: 'suar_test_tasks', must_exist: true } },
      { add: { index: 'suar_test_tasks_v1_20260809t000011', alias: 'suar_test_tasks', is_write_index: true } },
    ])
  })

  test('rejects promotion when the alias has a foreign backing index', async ({ assert }) => {
    let updateAliasesCalled = false
    const client = {
      indices: {
        exists: () => Promise.resolve(true),
        existsAlias: () => Promise.resolve(true),
        getAlias: () =>
          Promise.resolve({
            foreign_shared_index: { aliases: {} },
          }),
        updateAliases: () => {
          updateAliasesCalled = true
          return Promise.resolve({ acknowledged: true })
        },
      },
    } as unknown as Client
    const lifecycle = new VersionedSearchIndexLifecycle(
      client,
      'suar_test_projects',
      'suar_test_projects_v1'
    )

    let captured: unknown
    try {
      await lifecycle.activateGeneration('suar_test_projects_v1_20260726t163940')
    } catch (error) {
      captured = error
    }

    assert.instanceOf(captured, SearchIndexLifecycleError)
    assert.equal((captured as SearchIndexLifecycleError).code, 'SEARCH_INDEX_ALIAS_BACKING_UNOWNED')
    assert.isFalse(updateAliasesCalled)
  })

  test('rejects a stale rebuild when the current alias changed before cutover', async ({
    assert,
  }) => {
    let aliasPromoted = false
    const client = {
      indices: {
        exists: () => Promise.resolve(true),
        existsAlias: () => Promise.resolve(true),
        getAlias: () =>
          Promise.resolve({
            suar_test_projects_v1_newer: { aliases: {} },
          }),
        updateAliases: () => {
          aliasPromoted = true
          return Promise.resolve({ acknowledged: true })
        },
      },
    } as unknown as Client
    const lifecycle = new VersionedSearchIndexLifecycle(
      client,
      'suar_test_projects',
      'suar_test_projects_v1'
    )

    await assert.rejects(
      () =>
        lifecycle.activateGeneration('suar_test_projects_v1_candidate', [
          'suar_test_projects_v1',
        ]),
      /changed before generation activation/
    )
    assert.isFalse(aliasPromoted)
  })

  test('rejects promotion when the resulting alias state is inconsistent', async ({ assert }) => {
    const client = {
      indices: {
        exists: () => Promise.resolve(true),
        existsAlias: () => Promise.resolve(true),
        getAlias: () =>
          Promise.resolve({
            suar_test_projects_v1: { aliases: {} },
          }),
        updateAliases: () => Promise.resolve({ acknowledged: true }),
      },
    } as unknown as Client
    const lifecycle = new VersionedSearchIndexLifecycle(
      client,
      'suar_test_projects',
      'suar_test_projects_v1'
    )

    let captured: unknown
    try {
      await lifecycle.activateGeneration('suar_test_projects_v1_20260726t163940')
    } catch (error) {
      captured = error
    }

    assert.instanceOf(captured, SearchIndexLifecycleError)
    assert.equal(
      (captured as SearchIndexLifecycleError).code,
      'SEARCH_INDEX_ALIAS_STATE_INCONSISTENT'
    )
  })

  test('verifies candidate document count before alias promotion', async ({ assert }) => {
    const calls: string[] = []
    let activeIndexName = 'suar_test_skills_v1'
    const client = {
      indices: {
        existsAlias: () => Promise.resolve(true),
        getAlias: () =>
          Promise.resolve({
            [activeIndexName]: { aliases: {} },
          }),
        create: ({ index }: { index: string }) => {
          calls.push(`create:${index}`)
          return Promise.resolve({ acknowledged: true })
        },
        refresh: ({ index }: { index: string }) => {
          calls.push(`refresh:${index}`)
          return Promise.resolve({ _shards: { successful: 1, failed: 0, total: 1 } })
        },
        exists: () => Promise.resolve(true),
        updateAliases: () => {
          calls.push('activate')
          activeIndexName = 'suar_test_skills_v1_20260726t170000'
          return Promise.resolve({ acknowledged: true })
        },
      },
      count: ({ index }: { index: string }) => {
        calls.push(`count:${index}`)
        return Promise.resolve({ count: 2 })
      },
    } as unknown as Client
    const lifecycle = new VersionedSearchIndexLifecycle(
      client,
      'suar_test_skills',
      'suar_test_skills_v1'
    )
    await lifecycle.ensureIndex(definition)

    const result = await lifecycle.rebuildIndex((physicalIndexName) => {
      calls.push(`populate:${physicalIndexName}`)
      return Promise.resolve(2)
    }, '20260726t170000')

    assert.deepEqual(result, {
      activatedIndexName: 'suar_test_skills_v1_20260726t170000',
      previousIndexNames: ['suar_test_skills_v1'],
      documentCount: 2,
    })
    assert.deepEqual(calls, [
      'create:suar_test_skills_v1_20260726t170000',
      'populate:suar_test_skills_v1_20260726t170000',
      'refresh:suar_test_skills_v1_20260726t170000',
      'count:suar_test_skills_v1_20260726t170000',
      'activate',
    ])
  })

  test('builds a validated candidate without changing the stable alias', async ({ assert }) => {
    const calls: string[] = []
    const client = {
      indices: {
        existsAlias: () => Promise.resolve(true),
        getAlias: () => Promise.resolve({ suar_test_tasks_v1: { aliases: {} } }),
        create: ({ index }: { index: string }) => { calls.push(`create:${index}`); return Promise.resolve({ acknowledged: true }) },
        refresh: ({ index }: { index: string }) => { calls.push(`refresh:${index}`); return Promise.resolve({}) },
        exists: () => Promise.resolve(true),
        updateAliases: () => { calls.push('activate'); return Promise.resolve({ acknowledged: true }) },
      },
      count: ({ index }: { index: string }) => { calls.push(`count:${index}`); return Promise.resolve({ count: 2 }) },
    } as unknown as Client
    const lifecycle = new VersionedSearchIndexLifecycle(client, 'suar_test_tasks', 'suar_test_tasks_v1')
    await lifecycle.ensureIndex(definition)

    const result = await lifecycle.buildCandidate((physicalIndexName) => {
      calls.push(`populate:${physicalIndexName}`)
      return Promise.resolve(2)
    }, '20260726t170002')

    assert.equal(result.physicalIndexName, 'suar_test_tasks_v1_20260726t170002')
    assert.deepEqual(calls, [
      'create:suar_test_tasks_v1_20260726t170002',
      'populate:suar_test_tasks_v1_20260726t170002',
      'refresh:suar_test_tasks_v1_20260726t170002',
      'count:suar_test_tasks_v1_20260726t170002',
    ])
  })

  test('does not promote a generation when count verification fails', async ({ assert }) => {
    let aliasPromoted = false
    const client = {
      indices: {
        existsAlias: () => Promise.resolve(true),
        getAlias: () => Promise.resolve({ suar_test_tasks_v1: { aliases: {} } }),
        create: () => Promise.resolve({ acknowledged: true }),
        refresh: () =>
          Promise.resolve({
            _shards: { successful: 1, failed: 0, total: 1 },
          }),
        updateAliases: () => {
          aliasPromoted = true
          return Promise.resolve({ acknowledged: true })
        },
      },
      count: () => Promise.resolve({ count: 1 }),
    } as unknown as Client
    const lifecycle = new VersionedSearchIndexLifecycle(
      client,
      'suar_test_tasks',
      'suar_test_tasks_v1'
    )
    await lifecycle.ensureIndex(definition)

    await assert.rejects(
      () => lifecycle.rebuildIndex(() => Promise.resolve(2), '20260726t170001'),
      /expected 2 documents, found 1/
    )
    assert.isFalse(aliasPromoted)
  })

  test('resets only explicitly enumerated physical indices owned by the alias', async ({
    assert,
  }) => {
    let deleteTargets: string[] = []
    const client = {
      indices: {
        existsAlias: () => Promise.resolve(true),
        getAlias: () =>
          Promise.resolve({
            suar_test_tasks_v1: { aliases: {} },
            foreign_shared_index: { aliases: {} },
          }),
        get: () =>
          Promise.resolve({
            'suar_test_tasks_v1': {},
            'suar_test_tasks_v1_20260726-abc': {},
            'suar_test_tasks_v2_unowned': {},
            'suar_test_tasks_archive': {},
            'suar_test_tasks_v1_,unsafe': {},
          }),
        delete: ({ index }: { index: string[] }) => {
          deleteTargets = index
          return Promise.resolve({ acknowledged: true })
        },
      },
    } as unknown as Client
    const lifecycle = new VersionedSearchIndexLifecycle(
      client,
      'suar_test_tasks',
      'suar_test_tasks_v1'
    )

    await lifecycle.resetIndex()

    assert.deepEqual(deleteTargets, ['suar_test_tasks_v1', 'suar_test_tasks_v1_20260726-abc'])
    assert.notInclude(deleteTargets, 'foreign_shared_index')
  })

  test('rejects unbounded generation identifiers', ({ assert }) => {
    assert.throws(
      () => buildSearchGenerationIndexName('suar_test_tasks', 'v2,*'),
      'Search index generation must be a lowercase bounded identifier'
    )
  })
})
