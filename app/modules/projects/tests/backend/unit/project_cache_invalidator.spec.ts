import { test } from '@japa/runner'

import {
  invalidateProjectCaches,
  invalidateProjectCollectionCaches,
  invalidateProjectMembershipCaches,
} from '#modules/projects/infra/cache/project_cache_invalidator'

function createPatternSpy() {
  const patterns: string[] = []
  return {
    patterns,
    store: {
      deleteByPattern(pattern: string) {
        patterns.push(pattern)
        return Promise.resolve()
      },
    },
  }
}

test.group('Project cache invalidator', () => {
  test('rotates public work-history after project visibility changes', async ({ assert }) => {
    const spy = createPatternSpy()

    await invalidateProjectCaches('project-1', spy.store)

    assert.deepEqual(spy.patterns, ['users:work_history:*'])
  })

  test('invalidates only the active task metadata projection', async ({ assert }) => {
    const spy = createPatternSpy()

    await invalidateProjectCollectionCaches(spy.store)

    assert.deepEqual(spy.patterns, ['task:metadata:*'])
  })

  test('rotates revocation-sensitive user projections after membership changes', async ({
    assert,
  }) => {
    const spy = createPatternSpy()

    await invalidateProjectMembershipCaches('project-1', 'user-1', spy.store)

    assert.sameMembers(spy.patterns, [
      'user:pending_reviews:*:userId:user-1',
      'users:work_history:user-1:*',
      'tasks:grouped:*:user:user-1:*',
      'tasks:timeline:*:user:user-1:*',
      'task:stats:*:user:user-1:*',
    ])
  })
})
