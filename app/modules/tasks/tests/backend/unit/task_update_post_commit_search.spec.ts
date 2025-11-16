import { test } from '@japa/runner'

import UpdateTaskDTO from '#modules/tasks/actions/dtos/request/update_task_dto'
import type { TaskCachePort } from '#modules/tasks/actions/ports/task_cache_port'
import type { TaskUserReader } from '#modules/tasks/actions/ports/task_external_dependencies'
import { runUpdateTaskPostCommitEffects } from '#modules/tasks/actions/support/update_task_post_commit_support'

const VALID_UUID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'
const VALID_UUID_2 = 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e'

function resolvedVoid(): Promise<void> {
  return Promise.resolve()
}

class TaskCacheStub implements TaskCachePort {
  invalidateAfterTaskCreated() {
    return resolvedVoid()
  }
  invalidateAfterTaskUpdated() {
    return resolvedVoid()
  }
  invalidateAfterTaskDeleted() {
    return resolvedVoid()
  }
  invalidateAfterTaskAssigned() {
    return resolvedVoid()
  }
  invalidateAfterTaskAccessChanged() {
    return resolvedVoid()
  }
  invalidateAfterTaskApplicationChanged() {
    return resolvedVoid()
  }
  invalidateTaskDetail() {
    return resolvedVoid()
  }
}

test.group('Update task post-commit search hook', () => {
  test('invalidates cache after emitting task updated event', async ({ assert }) => {
    const calls: string[] = []
    const cache = new TaskCacheStub()
    cache.invalidateAfterTaskUpdated = () => {
      calls.push('cache')
      return Promise.resolve()
    }
    const rawSearchIndexer = {
      handle: () => Promise.resolve(null),
    }
    const searchIndexer = rawSearchIndexer as unknown as Parameters<
      typeof runUpdateTaskPostCommitEffects
    >[3]
    const rawUserReader = {
      findUserIdentity: () => Promise.resolve({
        id: VALID_UUID,
        username: 'Updater',
        email: 'updater@example.com',
      }),
    }
    const userReader = rawUserReader as unknown as Pick<TaskUserReader, 'findUserIdentity'>
    const rawEventPublisher = {
      publishTaskCreated: () => Promise.resolve(),
      publishTaskUpdated: () => Promise.resolve(),
      publishTaskDeleted: () => Promise.resolve(),
      publishTaskStatusChanged: () => Promise.resolve(),
      publishTaskAssignmentCompleted: () => Promise.resolve(),
      publishTaskAssigned: () => Promise.resolve(),
      publishTaskAccessRevoked: () => Promise.resolve(),
      publishTaskApplicationSubmitted: () => Promise.resolve(),
      publishTaskApplicationReviewed: () => Promise.resolve(),
    }
    const eventPublisher = rawEventPublisher as unknown as Parameters<
      typeof runUpdateTaskPostCommitEffects
    >[6]

    await runUpdateTaskPostCommitEffects(
      {
        task: {
          id: VALID_UUID,
          title: 'Refactor search sync',
          assigned_to: VALID_UUID_2,
        },
        oldAssignedTo: null,
        oldValues: {},
        changes: [],
      },
      VALID_UUID,
      UpdateTaskDTO.fromPartialUpdate({ title: 'Refactor search sync' }),
      searchIndexer,
      userReader,
      cache,
      eventPublisher
    )

    assert.deepEqual(calls, ['cache'])
  })
})
