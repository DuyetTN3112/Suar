import { test } from '@japa/runner'

import { TaskSearchProjectionCommands } from '#modules/search/actions/commands/projections/task_search_projection_commands'
import type { TaskSearchSyncReader } from '#modules/search/actions/ports/outbound/task_search_sync_reader'

test.group('Unit | Task Search Projection Commands', () => {
  test('does not touch projection dependencies when the injected runtime is disabled', async ({
    assert,
  }) => {
    const calls: string[] = []
    const repository = {
      ensureIndex: () => {
        calls.push('repo:ensure')
        return Promise.resolve()
      },
      resetIndex: () => {
        calls.push('repo:reset')
        return Promise.resolve()
      },
      bulkUpsertDocuments: () => {
        calls.push('repo:bulk')
        return Promise.resolve()
      },
      deleteDocument: () => {
        calls.push('repo:delete')
        return Promise.resolve()
      },
      upsertDocument: () => {
        calls.push('repo:upsert')
        return Promise.resolve()
      },
    } as unknown as ConstructorParameters<typeof TaskSearchProjectionCommands>[0]
    const builder = {
      build: () => {
        calls.push('builder:build')
        return Promise.reject(new Error('disabled runtime must not build'))
      },
    } as unknown as ConstructorParameters<typeof TaskSearchProjectionCommands>[1]
    const service = new TaskSearchProjectionCommands(
      repository,
      builder,
      {
        listNotDeletedTaskIds: () => {
          calls.push('reader:list')
          return Promise.resolve(['task-1'])
        },
      },
      {
        isEnabled: () => false,
      }
    )

    await service.reindexDocument('task-1')
    const result = await service.reindexAll()

    assert.deepEqual(result, { indexed: 0, skipped: 0 })
    assert.deepEqual(calls, [])
  })

  test('reindexAll consumes non-deleted task ids from task search sync reader', async ({
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
      replaceAllDocuments: (documents: Array<{ task_id?: string; id?: string }>) => {
        calls.push(
          `repo:replace:${documents.map((document) => document.task_id ?? document.id ?? '').join(',')}`
        )
        return Promise.resolve()
      },
      deleteDocument: () => Promise.resolve(),
      upsertDocument: () => Promise.resolve(),
    }
    const repository = rawRepository as unknown as ConstructorParameters<
      typeof TaskSearchProjectionCommands
    >[0]
    const rawBuilder = {
      build: (taskId: string) => {
        calls.push(`builder:${taskId}`)
        return Promise.resolve({
          id: taskId,
          task_id: taskId,
          is_public: taskId !== 'skip-task',
          assigned_to: taskId === 'assigned-task' ? 'user-1' : null,
          deleted_at: null,
        })
      },
    }
    const builder = rawBuilder as unknown as ConstructorParameters<
      typeof TaskSearchProjectionCommands
    >[1]

    const service = new TaskSearchProjectionCommands(
      repository,
      builder,
      {
        listNotDeletedTaskIds: () => {
          calls.push('reader:notDeleted')
          return Promise.resolve(['task-1', 'skip-task', 'assigned-task', 'task-2'])
        },
      } satisfies TaskSearchSyncReader,
      {
        isEnabled: () => true,
      }
    )

    const result = await service.reindexAll()

    assert.deepEqual(result, { indexed: 2, skipped: 2 })
    assert.deepEqual(calls, [
      'reader:notDeleted',
      'builder:task-1',
      'builder:skip-task',
      'builder:assigned-task',
      'builder:task-2',
      'repo:replace:task-1,task-2',
    ])
  })
})
