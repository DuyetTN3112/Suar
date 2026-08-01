import { test } from '@japa/runner'

import { ApplySearchIndexCleanupCommand } from '#modules/search/actions/commands/apply_search_index_cleanup_command'
import { ApplySearchIndexRollbackCommand } from '#modules/search/actions/commands/apply_search_index_rollback_command'
import type {
  ActivateSearchIndexInput,
  DeleteRetiredSearchIndicesInput,
  SearchIndexAdministrationPort,
  SearchIndexDescriptor,
  SearchIndexInventory,
} from '#modules/search/actions/ports/outbound/search_index_administration_port'
import { InspectSearchIndicesQuery } from '#modules/search/actions/queries/inspect_search_indices_query'
import { PreviewSearchIndexCleanupQuery } from '#modules/search/actions/queries/preview_search_index_cleanup_query'
import { PreviewSearchIndexRollbackQuery } from '#modules/search/actions/queries/preview_search_index_rollback_query'
import { SearchIndexAdministrationError } from '#modules/search/domain/search_index_administration_error'
import {
  SEARCH_INDEX_CLEANUP_CONFIRMATION,
  SEARCH_INDEX_ROLLBACK_CONFIRMATION,
} from '#modules/search/domain/search_index_administration_policy'

const descriptor: SearchIndexDescriptor = {
  target: 'tasks',
  aliasName: 'suar_test_tasks',
  initialPhysicalIndexName: 'suar_test_tasks_v1',
}

function generation(input: {
  indexName: string
  createdAt: string | null
  active?: boolean
  aliases?: string[]
  documentCount?: number
}) {
  return {
    indexName: input.indexName,
    active: input.active ?? false,
    writeIndex: input.active ?? false,
    aliases: input.aliases ?? [],
    documentCount: input.documentCount ?? 1,
    createdAt: input.createdAt,
  }
}

function inventory(): SearchIndexInventory {
  return {
    target: 'tasks',
    aliasName: descriptor.aliasName,
    initialPhysicalIndexName: descriptor.initialPhysicalIndexName,
    activeIndexNames: ['suar_test_tasks_v1_current'],
    generations: [
      generation({
        indexName: 'suar_test_tasks_v1_current',
        createdAt: '2026-07-27T10:00:00.000Z',
        active: true,
        aliases: [descriptor.aliasName],
        documentCount: 20,
      }),
      generation({
        indexName: 'suar_test_tasks_v1_newest-retired',
        createdAt: '2026-07-26T10:00:00.000Z',
        documentCount: 19,
      }),
      generation({
        indexName: 'suar_test_tasks_v1_second-retired',
        createdAt: '2026-07-25T10:00:00.000Z',
        documentCount: 18,
      }),
      generation({
        indexName: 'suar_test_tasks_v1_old',
        createdAt: '2026-07-20T10:00:00.000Z',
        documentCount: 17,
      }),
      generation({
        indexName: 'suar_test_tasks_v1_aliased',
        createdAt: '2026-07-19T10:00:00.000Z',
        aliases: ['incident-hold'],
      }),
      generation({
        indexName: 'suar_test_tasks_v1_unknown-date',
        createdAt: null,
      }),
    ],
  }
}

function makePort(options: {
  currentInventory?: SearchIndexInventory
  deleted?: DeleteRetiredSearchIndicesInput[]
  activations?: ActivateSearchIndexInput[]
}): SearchIndexAdministrationPort {
  return {
    inspect: () => Promise.resolve(options.currentInventory ?? inventory()),
    deleteRetired: (input) => {
      options.deleted?.push(input)
      return Promise.resolve()
    },
    activate: (input) => {
      options.activations?.push(input)
      return Promise.resolve()
    },
  }
}

const planTokenGenerator = {
  generate: (payload: unknown) => JSON.stringify(payload),
}
const fixedNow = () => new Date('2026-07-27T12:00:00.000Z')

test.group('Search index administration use cases', () => {
  test('inspects the selected index inventory through a query', async ({ assert }) => {
    const query = new InspectSearchIndicesQuery(makePort({}), [descriptor])

    const result = await query.handle({ target: 'tasks' })

    assert.deepEqual(result, [inventory()])
  })

  test('previews only old alias-free generations beyond the rollback retention count', async ({
    assert,
  }) => {
    const query = new PreviewSearchIndexCleanupQuery(
      makePort({}),
      [descriptor],
      planTokenGenerator,
      fixedNow
    )

    const result = await query.handle({
      target: 'tasks',
      retainRetired: 2,
      olderThanHours: 24,
    })

    assert.equal(result.mode, 'preview')
    assert.deepEqual(
      result.candidates.map((candidate) => candidate.indexName),
      ['suar_test_tasks_v1_old']
    )
    assert.deepEqual(result.deletedIndexNames, [])
  })

  test('applies an exact cleanup plan only with reason and confirmation', async ({ assert }) => {
    const deleted: DeleteRetiredSearchIndicesInput[] = []
    const port = makePort({ deleted })
    const previewQuery = new PreviewSearchIndexCleanupQuery(
      port,
      [descriptor],
      planTokenGenerator,
      fixedNow
    )
    const applyCommand = new ApplySearchIndexCleanupCommand(
      port,
      [descriptor],
      planTokenGenerator,
      fixedNow
    )
    const preview = await previewQuery.handle({
      target: 'tasks',
      retainRetired: 2,
      olderThanHours: 24,
    })

    const result = await applyCommand.handle({
      target: 'tasks',
      retainRetired: 2,
      olderThanHours: 24,
      reason: 'Retire generation after verified rollback window INC-2026-27',
      confirmation: SEARCH_INDEX_CLEANUP_CONFIRMATION,
      expectedPlanToken: preview.planToken,
    })

    assert.equal(result.mode, 'applied')
    assert.deepEqual(result.deletedIndexNames, ['suar_test_tasks_v1_old'])
    assert.deepEqual(deleted, [
      {
        descriptor,
        indexNames: ['suar_test_tasks_v1_old'],
        expectedActiveIndexNames: ['suar_test_tasks_v1_current'],
      },
    ])
  })

  test('rejects apply when inventory changed after the reviewed preview', async ({ assert }) => {
    const currentInventory = inventory()
    const port = makePort({ currentInventory })
    const previewQuery = new PreviewSearchIndexCleanupQuery(
      port,
      [descriptor],
      planTokenGenerator,
      fixedNow
    )
    const applyCommand = new ApplySearchIndexCleanupCommand(
      port,
      [descriptor],
      planTokenGenerator,
      fixedNow
    )
    const preview = await previewQuery.handle({
      target: 'tasks',
      retainRetired: 2,
      olderThanHours: 24,
    })
    const oldGeneration = currentInventory.generations.find(
      (generationRecord) => generationRecord.indexName === 'suar_test_tasks_v1_old'
    )
    if (!oldGeneration) {
      throw new Error('Expected old generation fixture')
    }
    oldGeneration.documentCount += 1

    let captured: unknown
    try {
      await applyCommand.handle({
        target: 'tasks',
        retainRetired: 2,
        olderThanHours: 24,
        reason: 'Retire generation after verified rollback window INC-2026-27',
        confirmation: SEARCH_INDEX_CLEANUP_CONFIRMATION,
        expectedPlanToken: preview.planToken,
      })
    } catch (error) {
      captured = error
    }

    assert.instanceOf(captured, SearchIndexAdministrationError)
    assert.equal(
      (captured as SearchIndexAdministrationError).code,
      'SEARCH_INDEX_CLEANUP_PLAN_MISMATCH'
    )
  })

  test('requires cleanup apply to select one exact index family', async ({ assert }) => {
    const otherDescriptor: SearchIndexDescriptor = {
      target: 'projects',
      aliasName: 'suar_test_projects',
      initialPhysicalIndexName: 'suar_test_projects_v1',
    }
    const command = new ApplySearchIndexCleanupCommand(
      makePort({}),
      [descriptor, otherDescriptor],
      planTokenGenerator
    )

    await assert.rejects(
      () =>
        command.handle({
          target: 'all',
          reason: 'Approved exact cleanup for every Search index family',
          confirmation: SEARCH_INDEX_CLEANUP_CONFIRMATION,
          expectedPlanToken: 'not-applicable',
        }),
      /requires one exact index target/
    )
  })

  test('rejects cleanup apply without exact confirmation', async ({ assert }) => {
    const command = new ApplySearchIndexCleanupCommand(
      makePort({}),
      [descriptor],
      planTokenGenerator
    )

    let captured: unknown
    try {
      await command.handle({
        target: 'tasks',
        reason: 'Valid cleanup reason for an approved maintenance change',
        confirmation: 'DELETE',
      })
    } catch (error) {
      captured = error
    }

    assert.instanceOf(captured, SearchIndexAdministrationError)
    assert.equal(
      (captured as SearchIndexAdministrationError).code,
      'SEARCH_INDEX_CLEANUP_CONFIRMATION_REQUIRED'
    )
  })

  test('previews and applies rollback with exact current-index fencing', async ({ assert }) => {
    const activations: ActivateSearchIndexInput[] = []
    const port = makePort({ activations })
    const previewQuery = new PreviewSearchIndexRollbackQuery(port, [descriptor])
    const applyCommand = new ApplySearchIndexRollbackCommand(port, [descriptor], true)

    const preview = await previewQuery.handle({
      target: 'tasks',
      expectedCurrentIndexName: 'suar_test_tasks_v1_current',
      rollbackIndexName: 'suar_test_tasks_v1_newest-retired',
    })
    const applied = await applyCommand.handle({
      target: 'tasks',
      expectedCurrentIndexName: 'suar_test_tasks_v1_current',
      rollbackIndexName: 'suar_test_tasks_v1_newest-retired',
      reason: 'Rollback approved for Search incident INC-2026-27',
      confirmation: SEARCH_INDEX_ROLLBACK_CONFIRMATION,
    })

    assert.equal(preview.mode, 'preview')
    assert.equal(applied.mode, 'applied')
    assert.deepEqual(activations, [
      {
        descriptor,
        expectedCurrentIndexName: 'suar_test_tasks_v1_current',
        targetIndexName: 'suar_test_tasks_v1_newest-retired',
      },
    ])
  })

  test('gates rollback apply while durable eligibility is unproven', async ({ assert }) => {
    const command = new ApplySearchIndexRollbackCommand(makePort({}), [descriptor], false)

    let captured: unknown
    try {
      await command.handle({
        target: 'tasks',
        expectedCurrentIndexName: 'suar_test_tasks_v1_current',
        rollbackIndexName: 'suar_test_tasks_v1_newest-retired',
        reason: 'Rollback approved for a controlled pre-production drill',
        confirmation: SEARCH_INDEX_ROLLBACK_CONFIRMATION,
      })
    } catch (error) {
      captured = error
    }

    assert.instanceOf(captured, SearchIndexAdministrationError)
    assert.equal(
      (captured as SearchIndexAdministrationError).code,
      'SEARCH_INDEX_ROLLBACK_ELIGIBILITY_UNPROVEN'
    )
  })

  test('blocks an empty rollback target unless explicitly approved', async ({ assert }) => {
    const emptyRollbackInventory = inventory()
    const rollback = emptyRollbackInventory.generations.find(
      (item) => item.indexName === 'suar_test_tasks_v1_newest-retired'
    )
    if (!rollback) {
      throw new Error('Expected rollback fixture')
    }
    rollback.documentCount = 0
    const query = new PreviewSearchIndexRollbackQuery(
      makePort({ currentInventory: emptyRollbackInventory }),
      [descriptor]
    )

    await assert.rejects(
      () =>
        query.handle({
          target: 'tasks',
          expectedCurrentIndexName: 'suar_test_tasks_v1_current',
          rollbackIndexName: 'suar_test_tasks_v1_newest-retired',
        }),
      /requires explicit allow-empty approval/
    )
  })
})
