import { test } from '@japa/runner'

import AdminSearchProjectionController from '#modules/http/controllers/search-discovery/admin_search_projection_controller'
import { ApplySearchIndexCleanupCommand } from '#modules/search/actions/commands/index-administration/apply_search_index_cleanup_command'
import { ApplySearchIndexRollbackCommand } from '#modules/search/actions/commands/index-administration/apply_search_index_rollback_command'
import type {
  ActivateSearchIndexInput,
  DeleteRetiredSearchIndicesInput,
  SearchIndexAdministrationPort,
  SearchIndexDescriptor,
  SearchIndexInventory,
} from '#modules/search/actions/ports/outbound/search_index_administration_port'
import { AuthorizeSearchIndexOperatorQuery } from '#modules/search/actions/queries/index-administration/authorize_search_index_operator_query'
import { InspectSearchIndicesQuery } from '#modules/search/actions/queries/index-administration/inspect_search_indices_query'
import { PreviewSearchIndexCleanupQuery } from '#modules/search/actions/queries/index-administration/preview_search_index_cleanup_query'
import { PreviewSearchIndexRollbackQuery } from '#modules/search/actions/queries/index-administration/preview_search_index_rollback_query'
import {
  SEARCH_INDEX_CLEANUP_CONFIRMATION,
  SEARCH_INDEX_ROLLBACK_CONFIRMATION,
} from '#modules/search/domain/index-administration/search_index_administration_policy'

const descriptor: SearchIndexDescriptor = {
  target: 'tasks',
  aliasName: 'suar_tasks',
  initialPhysicalIndexName: 'suar_tasks_v1',
}
const actorId = '019fa98a-927e-7cdf-86a3-03dbf6caa185'

function inventory(): SearchIndexInventory {
  return {
    target: 'tasks',
    aliasName: descriptor.aliasName,
    initialPhysicalIndexName: descriptor.initialPhysicalIndexName,
    activeIndexNames: ['suar_tasks_v2'],
    generations: [
      {
        indexName: 'suar_tasks_v2',
        active: true,
        writeIndex: true,
        aliases: [descriptor.aliasName],
        documentCount: 2,
        createdAt: '2026-08-01T00:00:00.000Z',
      },
      {
        indexName: 'suar_tasks_v1',
        active: false,
        writeIndex: false,
        aliases: [],
        documentCount: 1,
        createdAt: '2026-07-01T00:00:00.000Z',
      },
    ],
  }
}

function context(input: { query?: Record<string, unknown>; body?: Record<string, unknown> }) {
  const response = {
    statusCode: 0,
    payload: undefined as unknown,
    status(statusCode: number) {
      this.statusCode = statusCode
      return this
    },
    json(payload: unknown) {
      this.payload = payload
      return payload
    },
  }
  return {
    auth: { user: { id: actorId } },
    request: {
      input: (key: string, fallback?: unknown) => input.query?.[key] ?? fallback,
      body: () => input.body ?? {},
    },
    response,
  }
}

test.group('Integration | Admin Search Projection API controller boundary', () => {
  test('runs list, cleanup preview/apply, and rollback preview/apply through authorized use cases', async ({
    assert,
  }) => {
    const deleted: DeleteRetiredSearchIndicesInput[] = []
    const activations: ActivateSearchIndexInput[] = []
    const port: SearchIndexAdministrationPort = {
      inspect: () => Promise.resolve(inventory()),
      deleteRetired: (input) => {
        deleted.push(input)
        return Promise.resolve()
      },
      activate: (input) => {
        activations.push(input)
        return Promise.resolve()
      },
    }
    const authorization = new AuthorizeSearchIndexOperatorQuery(
      {
        findPrincipal: (id) => Promise.resolve({ id, systemRole: 'superadmin', status: 'active' }),
      },
      { hasPermission: () => Promise.resolve(true) },
      actorId
    )
    const planTokens = { generate: (payload: unknown) => JSON.stringify(payload) }
    const controller = new AdminSearchProjectionController({
      authorize: authorization,
      inspect: new InspectSearchIndicesQuery(port, [descriptor]),
      previewCleanup: new PreviewSearchIndexCleanupQuery(port, [descriptor], planTokens, () => new Date('2026-08-02T00:00:00.000Z')),
      applyCleanup: new ApplySearchIndexCleanupCommand(port, [descriptor], planTokens, () => new Date('2026-08-02T00:00:00.000Z')),
      previewRollback: new PreviewSearchIndexRollbackQuery(port, [descriptor]),
      applyRollback: new ApplySearchIndexRollbackCommand(port, [descriptor], true),
    })

    const listContext = context({ query: { target: 'tasks' } })
    await controller.index(listContext as never)
    assert.deepEqual(listContext.response.payload, { data: [inventory()] })

    const previewContext = context({ query: { target: 'tasks', retainRetired: '1', olderThanHours: '1' } })
    await controller.previewCleanup(previewContext as never)
    const preview = previewContext.response.payload as { data: { planToken: string } }
    assert.isString(preview.data.planToken)

    const applyContext = context({
      body: {
        target: 'tasks',
        retainRetired: 1,
        olderThanHours: 1,
        reason: 'Approved cleanup after verified retention policy',
        confirmation: SEARCH_INDEX_CLEANUP_CONFIRMATION,
        expectedPlanToken: preview.data.planToken,
      },
    })
    await controller.applyCleanup(applyContext as never)
    assert.deepEqual(deleted, [])

    const rollbackPreviewContext = context({
      query: {
        target: 'tasks',
        expectedCurrentIndexName: 'suar_tasks_v2',
        rollbackIndexName: 'suar_tasks_v1',
      },
    })
    await controller.previewRollback(rollbackPreviewContext as never)
    const rollbackContext = context({
      body: {
        target: 'tasks',
        expectedCurrentIndexName: 'suar_tasks_v2',
        rollbackIndexName: 'suar_tasks_v1',
        reason: 'Approved rollback after verified Search incident',
        confirmation: SEARCH_INDEX_ROLLBACK_CONFIRMATION,
      },
    })
    await controller.applyRollback(rollbackContext as never)
    assert.deepEqual(activations, [
      {
        descriptor,
        expectedCurrentIndexName: 'suar_tasks_v2',
        targetIndexName: 'suar_tasks_v1',
      },
    ])
  })
})
