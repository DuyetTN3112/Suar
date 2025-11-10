import { test } from '@japa/runner'

import { searchConfig } from '#config/search'
import { TaskSearchProjectionService } from '#modules/search/actions/services/task_search_projection_service'
import type { TaskSearchSyncReader } from '#modules/tasks/application/ports/task_search_sync_reader'

test.group('Unit | Task Search Projection Service', (group) => {
  group.each.setup(() => {
    searchConfig.enabled = true
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
      bulkUpsertDocuments: (documents: Array<{ task_id?: string; id?: string }>) => {
        calls.push(
          `repo:bulk:${documents.map((document) => document.task_id ?? document.id ?? '').join(',')}`
        )
        return Promise.resolve()
      },
      deleteDocument: () => Promise.resolve(),
      upsertDocument: () => Promise.resolve(),
    }
    const repository = rawRepository as unknown as ConstructorParameters<typeof TaskSearchProjectionService>[0]
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
    const builder = rawBuilder as unknown as ConstructorParameters<typeof TaskSearchProjectionService>[1]

    const service = new TaskSearchProjectionService(
      repository,
      builder,
      {
        listNotDeletedTaskIds: () => {
          calls.push('reader:notDeleted')
          return Promise.resolve(['task-1', 'skip-task', 'assigned-task', 'task-2'])
        },
      } satisfies TaskSearchSyncReader
    )

    const result = await service.reindexAll()

    assert.deepEqual(result, { indexed: 2, skipped: 2 })
    assert.deepEqual(calls, [
      'repo:reset',
      'repo:ensure',
      'reader:notDeleted',
      'builder:task-1',
      'builder:skip-task',
      'builder:assigned-task',
      'builder:task-2',
      'repo:bulk:task-1,task-2',
    ])
  })
})
