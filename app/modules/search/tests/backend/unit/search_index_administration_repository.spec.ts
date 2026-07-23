import type { Client } from '@elastic/elasticsearch'
import { test } from '@japa/runner'

import type { SearchIndexDescriptor } from '#modules/search/actions/ports/outbound/search_index_administration_port'
import { SearchIndexAdministrationError } from '#modules/search/domain/index-administration/search_index_administration_error'
import { ElasticsearchSearchIndexAdministrationRepository } from '#modules/search/infra/repositories/index-administration/search_index_administration_repository'

const descriptor: SearchIndexDescriptor = {
  target: 'tasks',
  aliasName: 'suar_test_tasks',
  initialPhysicalIndexName: 'suar_test_tasks_v1',
}

function indexDefinition(aliases: Record<string, { is_write_index?: boolean }> = {}) {
  return {
    aliases,
    settings: {
      index: {
        creation_date: String(Date.parse('2026-07-27T10:00:00.000Z')),
      },
    },
  }
}

test.group('Elasticsearch Search index administration repository', () => {
  test('rejects cleanup when the active alias changed after preview', async ({ assert }) => {
    let deleteCalled = false
    const client = {
      count: () => Promise.resolve({ count: 1 }),
      indices: {
        existsAlias: () => Promise.resolve(true),
        getAlias: () =>
          Promise.resolve({
            suar_test_tasks_v1_current: {
              aliases: {
                [descriptor.aliasName]: { is_write_index: true },
              },
            },
          }),
        get: () =>
          Promise.resolve({
            suar_test_tasks_v1_current: indexDefinition({
              [descriptor.aliasName]: { is_write_index: true },
            }),
            suar_test_tasks_v1_retired: indexDefinition(),
          }),
        delete: () => {
          deleteCalled = true
          return Promise.resolve({})
        },
      },
    } as unknown as Client
    const repository = new ElasticsearchSearchIndexAdministrationRepository(client)

    let captured: unknown
    try {
      await repository.deleteRetired({
        descriptor,
        indexNames: ['suar_test_tasks_v1_retired'],
        expectedActiveIndexNames: ['suar_test_tasks_v1_previous'],
      })
    } catch (error) {
      captured = error
    }

    assert.instanceOf(captured, SearchIndexAdministrationError)
    assert.equal(
      (captured as SearchIndexAdministrationError).code,
      'SEARCH_INDEX_CLEANUP_STATE_CHANGED'
    )
    assert.isFalse(deleteCalled)
  })

  test('rejects rollback when the retired target is attached to another alias', async ({
    assert,
  }) => {
    let updateAliasesCalled = false
    const client = {
      count: () => Promise.resolve({ count: 1 }),
      indices: {
        existsAlias: () => Promise.resolve(true),
        getAlias: () =>
          Promise.resolve({
            suar_test_tasks_v1_current: {
              aliases: {
                [descriptor.aliasName]: { is_write_index: true },
              },
            },
          }),
        get: () =>
          Promise.resolve({
            suar_test_tasks_v1_current: indexDefinition({
              [descriptor.aliasName]: { is_write_index: true },
            }),
            suar_test_tasks_v1_retired: indexDefinition({
              incident_hold: {},
            }),
          }),
        updateAliases: () => {
          updateAliasesCalled = true
          return Promise.resolve({})
        },
      },
    } as unknown as Client
    const repository = new ElasticsearchSearchIndexAdministrationRepository(client)

    let captured: unknown
    try {
      await repository.activate({
        descriptor,
        expectedCurrentIndexName: 'suar_test_tasks_v1_current',
        targetIndexName: 'suar_test_tasks_v1_retired',
      })
    } catch (error) {
      captured = error
    }

    assert.instanceOf(captured, SearchIndexAdministrationError)
    assert.equal(
      (captured as SearchIndexAdministrationError).code,
      'SEARCH_INDEX_ROLLBACK_TARGET_INVALID'
    )
    assert.isFalse(updateAliasesCalled)
  })
})
