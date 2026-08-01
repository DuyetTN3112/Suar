import { test } from '@japa/runner'

import { runTaskCreatedPostCommitEffects } from '#modules/tasks/actions/commands/internal/create_task_post_commit'
import type CreateTaskDTO from '#modules/tasks/actions/dtos/request/create_task_dto'
import type { TaskCachePort } from '#modules/tasks/actions/ports/outbound/task_cache_port'
import type { TaskRecord } from '#modules/tasks/types/task_records'

const VALID_UUID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'
const VALID_UUID_2 = 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e'

function resolvedVoid(): Promise<void> {
  return Promise.resolve()
}

class TaskCacheStub implements TaskCachePort {
  invalidateAfterTaskCreated() {
    return resolvedVoid()
  }
  invalidateAfterTaskCollectionMetadataChanged() {
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
  invalidateTaskScopedCaches() {
    return resolvedVoid()
  }
}

test.group('Task create post-commit support', () => {
  test('invalidates cache after emitting task created event', async ({ assert }) => {
    const calls: string[] = []
    const cache = new TaskCacheStub()
    cache.invalidateAfterTaskCreated = (organizationId?: string) => {
      calls.push(`cache:${organizationId ?? 'missing'}`)
      return Promise.resolve()
    }
    const rawTaskRecord = {
      id: VALID_UUID,
      title: 'Search-ready task',
      assigned_to: null,
    }
    const taskRecord = rawTaskRecord as unknown as TaskRecord
    const rawDto = {
      organization_id: VALID_UUID_2,
      project_id: VALID_UUID_2,
      assigned_to: undefined,
      isAssigned: () => false,
    }
    const dto = rawDto as unknown as CreateTaskDTO
    const eventPublisher: Parameters<typeof runTaskCreatedPostCommitEffects>[4] = {
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

    await runTaskCreatedPostCommitEffects(taskRecord, dto, VALID_UUID, cache, eventPublisher)

    assert.deepEqual(calls, [`cache:${VALID_UUID_2}`])
  })

  test('preserves committed success and still attempts invalidation when event publication fails', async ({
    assert,
  }) => {
    const calls: string[] = []
    const cache = new TaskCacheStub()
    cache.invalidateAfterTaskCreated = () => {
      calls.push('cache')
      return Promise.resolve()
    }
    const task = {
      id: VALID_UUID,
      title: 'Committed task',
      assigned_to: null,
    } as unknown as TaskRecord
    const dto = {
      organization_id: VALID_UUID_2,
      project_id: VALID_UUID_2,
      assigned_to: undefined,
      isAssigned: () => false,
    } as unknown as CreateTaskDTO
    const eventPublisher: Parameters<typeof runTaskCreatedPostCommitEffects>[4] = {
      publishTaskCreated: () => {
        calls.push('event')
        return Promise.reject(new Error('event transport unavailable'))
      },
      publishTaskUpdated: () => Promise.resolve(),
      publishTaskDeleted: () => Promise.resolve(),
      publishTaskStatusChanged: () => Promise.resolve(),
      publishTaskAssignmentCompleted: () => Promise.resolve(),
      publishTaskAssigned: () => Promise.resolve(),
      publishTaskAccessRevoked: () => Promise.resolve(),
      publishTaskApplicationSubmitted: () => Promise.resolve(),
      publishTaskApplicationReviewed: () => Promise.resolve(),
    }

    await assert.doesNotReject(() =>
      runTaskCreatedPostCommitEffects(task, dto, VALID_UUID, cache, eventPublisher)
    )

    assert.sameMembers(calls, ['event', 'cache'])
  })
})
