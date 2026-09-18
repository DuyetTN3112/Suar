import { test } from '@japa/runner'

import { runUpdateTaskPostCommitEffects } from '#modules/tasks/actions/commands/internal/update_task_post_commit'
import type { TaskCachePort } from '#modules/tasks/actions/ports/outbound/task_cache_port'

const VALID_UUID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'

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
  invalidateAfterTaskUpdated(_taskId: string, _organizationId?: string) {
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

test.group('Update task post-commit search hook', () => {
  test('invalidates cache after emitting task updated event', async ({ assert }) => {
    const calls: string[] = []
    const cache = new TaskCacheStub()
    cache.invalidateAfterTaskUpdated = (taskId: string, organizationId?: string) => {
      calls.push(`cache:${taskId}:${organizationId ?? 'missing'}`)
      return Promise.resolve()
    }
    const rawEventPublisher = {
      publishTaskCreated: () => Promise.resolve(),
      publishTaskUpdated: (
        event: Parameters<
          Parameters<typeof runUpdateTaskPostCommitEffects>[3]['publishTaskUpdated']
        >[0]
      ) => {
        calls.push(`event:${event.taskId}:${event.organizationId}`)
        return Promise.resolve()
      },
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
    >[3]

    await runUpdateTaskPostCommitEffects(
      {
        task: {
          id: VALID_UUID,
          organization_id: VALID_UUID,
          assigned_to: null,
        },
        oldAssignedTo: null,
        oldValues: {},
        changes: [],
      },
      VALID_UUID,
      cache,
      eventPublisher
    )

    assert.deepEqual(calls, [
      `event:${VALID_UUID}:${VALID_UUID}`,
      `cache:${VALID_UUID}:${VALID_UUID}`,
    ])
  })

  test('preserves committed success and still attempts invalidation when event publication fails', async ({
    assert,
  }) => {
    const calls: string[] = []
    const cache = new TaskCacheStub()
    cache.invalidateAfterTaskUpdated = () => {
      calls.push('cache')
      return Promise.resolve()
    }
    const eventPublisher = {
      publishTaskCreated: () => Promise.resolve(),
      publishTaskUpdated: () => {
        calls.push('event')
        return Promise.reject(new Error('event transport unavailable'))
      },
      publishTaskDeleted: () => Promise.resolve(),
      publishTaskStatusChanged: () => Promise.resolve(),
      publishTaskAssignmentCompleted: () => Promise.resolve(),
      publishTaskAssigned: () => Promise.resolve(),
      publishTaskAccessRevoked: () => Promise.resolve(),
      publishTaskApplicationSubmitted: () => Promise.resolve(),
      publishTaskApplicationReviewed: () => Promise.resolve(),
    } as unknown as Parameters<typeof runUpdateTaskPostCommitEffects>[3]

    await assert.doesNotReject(() =>
      runUpdateTaskPostCommitEffects(
        {
          task: {
            id: VALID_UUID,
            organization_id: VALID_UUID,
            assigned_to: null,
          },
          oldAssignedTo: null,
          oldValues: { title: 'Before commit' },
          changes: [{ field: 'title', oldValue: 'Before commit', newValue: 'Committed' }],
        },
        VALID_UUID,
        cache,
        eventPublisher
      )
    )

    assert.sameMembers(calls, ['event', 'cache'])
  })
})
