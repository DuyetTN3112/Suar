import { test } from '@japa/runner'

import { searchConfig } from '#config/search'
import type { ProjectSearchSyncReader } from '#modules/projects/application/ports/project_search_sync_reader'
import { ProjectSearchProjectionService } from '#modules/search/actions/services/project_search_projection_service'

test.group('Unit | Project Search Projection Service', (group) => {
  group.each.setup(() => {
    searchConfig.enabled = true
  })

  test('reindexAll consumes non-deleted project ids from project search sync reader', async ({
    assert,
  }) => {
    const calls: string[] = []
    const rawRepository = {
      ensureIndex: () => {
        calls.push('repo:ensure')
        return Promise.resolve()
      },
      resetIndex: () => {
        calls.push('repo:reset')
        return Promise.resolve()
      },
      bulkUpsertDocuments: (documents: Array<{ id: string }>) => {
        calls.push(`repo:bulk:${documents.map((document) => document.id).join(',')}`)
        return Promise.resolve()
      },
      deleteDocument: () => Promise.resolve(),
      upsertDocument: () => Promise.resolve(),
    }
    const repository = rawRepository as unknown as ConstructorParameters<typeof ProjectSearchProjectionService>[0]
    const rawBuilder = {
      build: (projectId: string) => {
        calls.push(`builder:${projectId}`)
        return Promise.resolve({
          id: projectId,
          deleted_at: projectId === 'deleted-project' ? '2026-01-01T00:00:00.000Z' : null,
        })
      },
    }
    const builder = rawBuilder as unknown as ConstructorParameters<typeof ProjectSearchProjectionService>[1]

    const service = new ProjectSearchProjectionService(
      repository,
      builder,
      {
        listNotDeletedProjectIds: () => {
          calls.push('reader:notDeleted')
          return Promise.resolve(['project-1', 'deleted-project', 'project-2'])
        },
      } satisfies ProjectSearchSyncReader
    )

    const result = await service.reindexAll()

    assert.deepEqual(result, { indexed: 2, skipped: 1 })
    assert.deepEqual(calls, [
      'repo:reset',
      'repo:ensure',
      'reader:notDeleted',
      'builder:project-1',
      'builder:deleted-project',
      'builder:project-2',
      'repo:bulk:project-1,project-2',
    ])
  })
})
