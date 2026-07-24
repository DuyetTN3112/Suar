import { randomUUID } from 'node:crypto'

import { test } from '@japa/runner'

import { setupApp, teardownApp } from '#tests/helpers/bootstrap'

test.group('Integration | Search index administration', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())

  test('cleans only expired retired generations and rolls back with exact alias fencing', async ({
    assert,
    cleanup,
  }) => {
    const [
      { buildSearchIndexName },
      { ApplySearchIndexCleanupCommand },
      { ApplySearchIndexRollbackCommand },
      { PreviewSearchIndexCleanupQuery },
      { PreviewSearchIndexRollbackQuery },
      { SEARCH_INDEX_CLEANUP_CONFIRMATION, SEARCH_INDEX_ROLLBACK_CONFIRMATION },
      { PostgresSearchIndexCutoverFence },
      { NodeSearchIndexPlanTokenGenerator },
      { ElasticsearchSearchIndexAdministrationRepository },
      { VersionedSearchIndexLifecycle },
      { searchClient },
    ] = await Promise.all([
      import('#config/search'),
      import('#modules/search/actions/commands/index-administration/apply_search_index_cleanup_command'),
      import('#modules/search/actions/commands/index-administration/apply_search_index_rollback_command'),
      import('#modules/search/actions/queries/index-administration/preview_search_index_cleanup_query'),
      import('#modules/search/actions/queries/index-administration/preview_search_index_rollback_query'),
      import('#modules/search/domain/index-administration/search_index_administration_policy'),
      import('#modules/search/infra/adapters/index-administration/postgres_search_index_cutover_fence'),
      import('#modules/search/infra/adapters/index-administration/node_search_index_plan_token_generator'),
      import('#modules/search/infra/repositories/index-administration/search_index_administration_repository'),
      import('#modules/search/infra/adapters/index-administration/versioned_search_index_lifecycle'),
      import('#platform/search/elasticsearch_client'),
    ])
    const suffix = randomUUID().replaceAll('-', '')
    const aliasName = buildSearchIndexName(`search_admin_it_${suffix}`)
    const initialPhysicalIndexName = `${aliasName}_v1`
    const descriptor = {
      target: 'tasks' as const,
      aliasName,
      initialPhysicalIndexName,
    }
    const definition = {
      mappings: {
        dynamic: 'strict' as const,
        properties: {
          label: { type: 'keyword' as const },
        },
      },
    }
    const cutoverFence = new PostgresSearchIndexCutoverFence()
    const lifecycle = new VersionedSearchIndexLifecycle(
      searchClient,
      aliasName,
      initialPhysicalIndexName,
      cutoverFence
    )
    const repository = new ElasticsearchSearchIndexAdministrationRepository(
      searchClient,
      cutoverFence
    )
    const now = () => new Date(Date.now() + 2 * 60 * 60 * 1000)
    const tokenGenerator = new NodeSearchIndexPlanTokenGenerator()
    const cleanupPreviewQuery = new PreviewSearchIndexCleanupQuery(
      repository,
      [descriptor],
      tokenGenerator,
      now
    )
    const cleanupCommand = new ApplySearchIndexCleanupCommand(
      repository,
      [descriptor],
      tokenGenerator,
      now
    )
    const rollbackPreviewQuery = new PreviewSearchIndexRollbackQuery(repository, [descriptor])
    const rollbackCommand = new ApplySearchIndexRollbackCommand(repository, [descriptor], true)

    cleanup(async () => {
      await lifecycle.resetIndex()
    })

    await lifecycle.ensureIndex(definition)
    await searchClient.index({
      index: initialPhysicalIndexName,
      id: 'initial',
      document: { label: 'initial' },
      refresh: 'wait_for',
    })

    const rollbackIndexName = await lifecycle.createGeneration(`rollback-${suffix}`, definition)
    await searchClient.index({
      index: rollbackIndexName,
      id: 'rollback',
      document: { label: 'rollback' },
      refresh: 'wait_for',
    })
    await lifecycle.activateGeneration(rollbackIndexName)

    const currentIndexName = await lifecycle.createGeneration(`current-${suffix}`, definition)
    await searchClient.index({
      index: currentIndexName,
      id: 'current-1',
      document: { label: 'current' },
    })
    await searchClient.index({
      index: currentIndexName,
      id: 'current-2',
      document: { label: 'current' },
      refresh: 'wait_for',
    })
    await lifecycle.activateGeneration(currentIndexName)

    const cleanupPreview = await cleanupPreviewQuery.handle({
      target: 'tasks',
      retainRetired: 1,
      olderThanHours: 1,
    })
    assert.deepEqual(
      cleanupPreview.candidates.map((candidate) => candidate.indexName),
      [initialPhysicalIndexName]
    )
    assert.isTrue(await searchClient.indices.exists({ index: initialPhysicalIndexName }))

    let releaseFence: (() => void) | undefined
    let announceFenceHeld: (() => void) | undefined
    const fenceHeld = new Promise<void>((resolve) => {
      announceFenceHeld = resolve
    })
    const allowFenceRelease = new Promise<void>((resolve) => {
      releaseFence = resolve
    })
    const blocker = cutoverFence.runExclusive(aliasName, async () => {
      announceFenceHeld?.()
      await allowFenceRelease
    })
    await fenceHeld
    let cleanupSettled = false
    const cleanupOperation = cleanupCommand
      .handle({
        target: 'tasks',
        retainRetired: 1,
        olderThanHours: 1,
        reason: 'Integration verification of owned retired generation cleanup',
        confirmation: SEARCH_INDEX_CLEANUP_CONFIRMATION,
        expectedPlanToken: cleanupPreview.planToken,
      })
      .finally(() => {
        cleanupSettled = true
      })
    await new Promise((resolve) => setTimeout(resolve, 75))
    assert.isFalse(cleanupSettled)
    assert.isTrue(await searchClient.indices.exists({ index: initialPhysicalIndexName }))
    releaseFence?.()
    await blocker
    const cleanupApplied = await cleanupOperation
    assert.deepEqual(cleanupApplied.deletedIndexNames, [initialPhysicalIndexName])
    assert.isFalse(await searchClient.indices.exists({ index: initialPhysicalIndexName }))
    assert.isTrue(await searchClient.indices.exists({ index: rollbackIndexName }))

    const rollbackPreview = await rollbackPreviewQuery.handle({
      target: 'tasks',
      expectedCurrentIndexName: currentIndexName,
      rollbackIndexName,
    })
    assert.equal(rollbackPreview.previousDocumentCount, 2)
    assert.equal(rollbackPreview.rollbackDocumentCount, 1)

    const rollbackApplied = await rollbackCommand.handle({
      target: 'tasks',
      expectedCurrentIndexName: currentIndexName,
      rollbackIndexName,
      reason: 'Integration verification of atomic Search alias rollback',
      confirmation: SEARCH_INDEX_ROLLBACK_CONFIRMATION,
    })
    assert.equal(rollbackApplied.mode, 'applied')
    assert.deepEqual(await lifecycle.getBackingIndices(), [rollbackIndexName])
    assert.isTrue(await searchClient.indices.exists({ index: currentIndexName }))
  }).timeout(15_000)
})
