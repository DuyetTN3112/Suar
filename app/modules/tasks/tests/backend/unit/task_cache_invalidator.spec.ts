import { test } from '@japa/runner'

import { TaskCacheInvalidator } from '#modules/tasks/infra/cache/task_cache_invalidator'

const makeInvalidator = () => {
  const patterns: string[] = []
  const invalidator = new TaskCacheInvalidator({
    deleteByPattern(pattern: string) {
      patterns.push(pattern)
      return Promise.resolve()
    },
  })

  return { invalidator, patterns }
}

test.group('Task cache invalidator', () => {
  test('assignment invalidates task-scoped audit and every permission-dependent collection', async ({
    assert,
  }) => {
    const { invalidator, patterns } = makeInvalidator()

    await invalidator.invalidateAfterTaskAssigned('task-1', 'org-1')

    assert.sameMembers(patterns, [
      'task:audit:task-1:*',
      'tasks:list:v2:org:org-1:*',
      'tasks:public:*',
      'task:user:*:org:org-1:*',
      'tasks:grouped:org:org-1:*',
      'tasks:timeline:org:org-1:*',
      'task:stats:org:org-1:*',
      'task:applications:*:taskId:task-1:*',
    ])
  })

  test('application changes invalidate task audit and applicant views', async ({ assert }) => {
    const { invalidator, patterns } = makeInvalidator()

    await invalidator.invalidateAfterTaskApplicationChanged('task-1', 'org-1', 'applicant-1')

    assert.sameMembers(patterns, [
      'task:audit:task-1:*',
      'task:applications:*:taskId:task-1:*',
      'task:user:*:org:org-1:*',
      'user:applications:*:userId:applicant-1*',
      'tasks:list:v2:org:org-1:*',
      'tasks:public:*',
      'tasks:grouped:org:org-1:*',
      'tasks:timeline:org:org-1:*',
      'task:stats:org:org-1:*',
    ])
  })

  test('task updates invalidate collection metadata used by parent-task selectors', async ({
    assert,
  }) => {
    const { invalidator, patterns } = makeInvalidator()

    await invalidator.invalidateAfterTaskUpdated('task-1', 'org-1')

    assert.sameMembers(patterns, [
      'task:audit:task-1:*',
      'tasks:list:v2:org:org-1:*',
      'tasks:public:*',
      'task:user:*:org:org-1:*',
      'tasks:grouped:org:org-1:*',
      'tasks:timeline:org:org-1:*',
      'task:stats:org:org-1:*',
      'task:metadata:*:org:org-1*',
    ])
  })

  test('metadata dependency changes invalidate every organization task projection', async ({
    assert,
  }) => {
    const { invalidator, patterns } = makeInvalidator()

    await invalidator.invalidateAfterTaskCollectionMetadataChanged('org-1')

    assert.sameMembers(patterns, [
      'tasks:list:v2:org:org-1:*',
      'tasks:public:*',
      'task:user:*:org:org-1:*',
      'tasks:grouped:org:org-1:*',
      'tasks:timeline:org:org-1:*',
      'task:stats:org:org-1:*',
      'task:metadata:*:org:org-1*',
    ])
  })

  test('keeps a global generation fallback for legacy callers without organization context', async ({
    assert,
  }) => {
    const { invalidator, patterns } = makeInvalidator()

    await invalidator.invalidateAfterTaskCreated()

    assert.include(patterns, 'tasks:list:*')
  })
})
