import { test } from '@japa/runner'

import { ProjectSearchProjectionCommands } from '#modules/search/actions/commands/projections/project_search_projection_commands'
import type { ProjectSearchSyncReader } from '#modules/search/actions/ports/outbound/project_search_sync_reader'

test.group('Unit | Project Search Projection Commands', () => {
  test('converges a missing hard-deleted project to a fenced index delete', async ({ assert }) => {
    const controller = new AbortController()
    let deleteContext: unknown
    const rawRepository = {
      deleteDocument: (_projectId: string, context: unknown) => {
        deleteContext = context
        return Promise.resolve()
      },
    }
    const repository = rawRepository as unknown as ConstructorParameters<
      typeof ProjectSearchProjectionCommands
    >[0]
    const rawBuilder = {
      build: () => Promise.resolve(null),
    }
    const builder = rawBuilder as unknown as ConstructorParameters<
      typeof ProjectSearchProjectionCommands
    >[1]
    const service = new ProjectSearchProjectionCommands(
      repository,
      builder,
      {
        listNotDeletedProjectIds: () => Promise.resolve([]),
      },
      {
        isEnabled: () => true,
      }
    )

    await service.reindexDocument('hard-deleted-project', {
      signal: controller.signal,
      externalVersion: 91,
      tombstoneAt: '2026-07-26T10:00:00.000Z',
    })

    assert.deepEqual(deleteContext, {
      signal: controller.signal,
      externalVersion: 91,
      tombstoneAt: '2026-07-26T10:00:00.000Z',
    })
  })

  test('passes the fencing context through successful document upserts', async ({ assert }) => {
    const controller = new AbortController()
    let upsertContext: unknown
    const document = { project_id: 'project-1', deleted_at: null }
    const rawRepository = {
      upsertDocument: (_document: unknown, context: unknown) => {
        upsertContext = context
        return Promise.resolve()
      },
    }
    const repository = rawRepository as unknown as ConstructorParameters<
      typeof ProjectSearchProjectionCommands
    >[0]
    const rawBuilder = {
      build: () => Promise.resolve(document),
    }
    const builder = rawBuilder as unknown as ConstructorParameters<
      typeof ProjectSearchProjectionCommands
    >[1]
    const service = new ProjectSearchProjectionCommands(
      repository,
      builder,
      {
        listNotDeletedProjectIds: () => Promise.resolve([]),
      },
      {
        isEnabled: () => true,
      }
    )

    await service.reindexDocument('project-1', {
      signal: controller.signal,
      externalVersion: 92,
    })

    assert.deepEqual(upsertContext, {
      signal: controller.signal,
      externalVersion: 92,
    })
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
      replaceAllDocuments: (documents: Array<{ id: string }>) => {
        calls.push(`repo:replace:${documents.map((document) => document.id).join(',')}`)
        return Promise.resolve()
      },
      deleteDocument: () => Promise.resolve(),
      upsertDocument: () => Promise.resolve(),
    }
    const repository = rawRepository as unknown as ConstructorParameters<
      typeof ProjectSearchProjectionCommands
    >[0]
    const rawBuilder = {
      build: (projectId: string) => {
        calls.push(`builder:${projectId}`)
        return Promise.resolve({
          id: projectId,
          deleted_at: projectId === 'deleted-project' ? '2026-01-01T00:00:00.000Z' : null,
        })
      },
    }
    const builder = rawBuilder as unknown as ConstructorParameters<
      typeof ProjectSearchProjectionCommands
    >[1]

    const service = new ProjectSearchProjectionCommands(
      repository,
      builder,
      {
        listNotDeletedProjectIds: () => {
          calls.push('reader:notDeleted')
          return Promise.resolve(['project-1', 'deleted-project', 'project-2'])
        },
      } satisfies ProjectSearchSyncReader,
      {
        isEnabled: () => true,
      }
    )

    const result = await service.reindexAll()

    assert.deepEqual(result, { indexed: 2, skipped: 1 })
    assert.deepEqual(calls, [
      'reader:notDeleted',
      'builder:project-1',
      'builder:deleted-project',
      'builder:project-2',
      'repo:replace:project-1,project-2',
    ])
  })
})
