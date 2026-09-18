import { test } from '@japa/runner'

import {
  TaskSearchIndexMigrationRequiredError,
  TaskSearchIndexRepository,
} from '#modules/search/infra/repositories/entity-search/tasks/task_search_index_repository'
import {
  cleanupTaskSearchDocData,
  searchDocument,
  setupTaskSearchDocGroup,
  teardownTaskSearchDocGroup,
} from '#modules/tasks/tests/backend/support/task-search/task_search_document_test_support'
import { searchClient } from '#platform/search/elasticsearch_client'

test.group('Integration | Task Search Document Reader - Index Mappings and Migrations', (group) => {
  group.setup(() => setupTaskSearchDocGroup())
  group.teardown(() => teardownTaskSearchDocGroup())
  group.each.teardown(() => cleanupTaskSearchDocData())

  test('blocks incompatible active mappings until a populated generation is atomically activated', async ({
    assert,
  }) => {
    const repository = new TaskSearchIndexRepository()
    await repository.resetIndex()

    try {
      await searchClient.indices.create({
        index: repository.physicalIndexName,
        mappings: {
          dynamic: 'strict',
          properties: {
            task_id: { type: 'keyword' },
            title: { type: 'text' },
          },
        },
        aliases: {
          [repository.indexName]: { is_write_index: true },
        },
      })

      await searchClient.index({
        index: repository.physicalIndexName,
        id: 'wp03-legacy-visible-hit',
        document: {
          task_id: 'wp03-legacy-visible-hit',
          title: 'Legacy metadata recall token',
        },
        refresh: 'wait_for',
      })

      await assert.rejects(() => repository.ensureIndex(), TaskSearchIndexMigrationRequiredError)
      await assert.rejects(
        () =>
          repository.search({
            q: 'legacy metadata recall token',
            limit: 5,
          }),
        TaskSearchIndexMigrationRequiredError
      )

      const legacyMappingBefore = await searchClient.indices.getMapping({
        index: repository.physicalIndexName,
      })
      assert.notProperty(
        legacyMappingBefore[repository.physicalIndexName]?.mappings.properties ?? {},
        'domain_tags'
      )

      await repository.replaceAllDocuments([
        searchDocument({
          task_id: 'wp03-reindexed',
          title: 'Reindexed metadata task',
          domain_tags: ['generation-safe-secondary'],
        }),
      ])

      const activeBackings = Object.keys(
        await searchClient.indices.getAlias({ name: repository.indexName })
      )
      assert.lengthOf(activeBackings, 1)
      assert.notEqual(activeBackings[0], repository.physicalIndexName)

      const legacyMappingAfter = await searchClient.indices.getMapping({
        index: repository.physicalIndexName,
      })
      assert.notProperty(
        legacyMappingAfter[repository.physicalIndexName]?.mappings.properties ?? {},
        'domain_tags'
      )

      const hits = await repository.search({
        q: 'generation-safe-secondary',
        limit: 5,
        organizationId: 'wp03-organization',
        publicOnly: true,
      })
      assert.deepEqual(
        hits.map((hit) => hit.taskId),
        ['wp03-reindexed']
      )
    } finally {
      await repository.resetIndex()
    }
  }).timeout(20_000)

  test('uses strict mappings so undeclared sensitive fields are rejected and never indexed', async ({
    assert,
  }) => {
    const repository = new TaskSearchIndexRepository()
    await repository.resetIndex()

    try {
      await repository.ensureIndex()

      const mappings = await searchClient.indices.getMapping({ index: repository.indexName })
      assert.isTrue(
        Object.values(mappings).every((descriptor) => descriptor.mappings.dynamic === 'strict')
      )

      await assert.rejects(
        () =>
          searchClient.index({
            index: repository.indexName,
            id: 'wp03-sensitive-runtime-field',
            document: {
              ...searchDocument({
                task_id: 'wp03-sensitive-runtime-field',
                title: 'Strict mapping sentinel',
              }),
              internal_compensation_notes: 'must never enter the search index',
            },
            refresh: 'wait_for',
          }),
        /strict_dynamic_mapping_exception|dynamic introduction.*not allowed/i
      )

      assert.isFalse(
        await searchClient.exists({
          index: repository.indexName,
          id: 'wp03-sensitive-runtime-field',
        })
      )
    } finally {
      await repository.resetIndex()
    }
  }).timeout(15_000)
})
