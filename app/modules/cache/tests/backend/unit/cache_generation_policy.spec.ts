import { test } from '@japa/runner'

import {
  CACHE_COLLECTION_GENERATION_NAMESPACES,
  TASK_LIST_CACHE_GENERATION_NAMESPACE,
  assertCacheGenerationNamespace,
  buildGenerationScopedCacheKey,
  cacheGenerationControlKey,
  cacheGenerationNamespaceForPattern,
  scopedCacheGenerationNamespace,
  taskListOrganizationCacheGenerationNamespace,
} from '#modules/cache/domain/cache_generation_policy'
import {
  CACHE_COLLECTION_GENERATION_NAMESPACES as PUBLIC_CACHE_COLLECTION_GENERATION_NAMESPACES,
  TASK_LIST_CACHE_GENERATION_NAMESPACE as PUBLIC_TASK_LIST_CACHE_GENERATION_NAMESPACE,
  entityCacheGenerationNamespaces,
  globalCacheGenerationNamespaces,
  organizationCacheGenerationNamespaces,
  organizationUserCacheGenerationNamespaces,
  reviewSessionCacheKey,
  taskListCacheInvalidationPattern,
  taskListCacheGenerationNamespaces,
  taskMetadataCacheInvalidationPattern,
} from '#modules/cache/public_contracts/cache_contract'

test.group('Cache generation policy', () => {
  test('keeps the public reader namespace aligned with the internal invalidation router', ({
    assert,
  }) => {
    assert.equal(PUBLIC_TASK_LIST_CACHE_GENERATION_NAMESPACE, TASK_LIST_CACHE_GENERATION_NAMESPACE)
    assert.deepEqual(
      PUBLIC_CACHE_COLLECTION_GENERATION_NAMESPACES,
      CACHE_COLLECTION_GENERATION_NAMESPACES
    )
    assert.deepEqual(taskListCacheGenerationNamespaces('org-1'), [
      TASK_LIST_CACHE_GENERATION_NAMESPACE,
      taskListOrganizationCacheGenerationNamespace('org-1'),
    ])
    assert.equal(taskListCacheInvalidationPattern('org-1'), 'tasks:list:v2:org:org-1:*')
    assert.equal(taskMetadataCacheInvalidationPattern('org-1'), 'task:metadata:*:org:org-1*')
    assert.equal(reviewSessionCacheKey('session-1'), 'review:session:v4:sessionId:session-1')
  })

  test('routes collection invalidations to global, tenant, or entity generations', ({ assert }) => {
    const globalCases = [
      ['tasks:public:*', CACHE_COLLECTION_GENERATION_NAMESPACES.publicTasks],
      ['task:user:*', CACHE_COLLECTION_GENERATION_NAMESPACES.userTasks],
      ['tasks:grouped:*', CACHE_COLLECTION_GENERATION_NAMESPACES.groupedTasks],
      ['tasks:timeline:*', CACHE_COLLECTION_GENERATION_NAMESPACES.timelineTasks],
      ['task:stats:*', CACHE_COLLECTION_GENERATION_NAMESPACES.taskStatistics],
      ['task:metadata:*', CACHE_COLLECTION_GENERATION_NAMESPACES.taskMetadata],
      ['task:audit:*', CACHE_COLLECTION_GENERATION_NAMESPACES.taskAudit],
      ['task:applications:*', CACHE_COLLECTION_GENERATION_NAMESPACES.taskApplications],
      ['user:applications:*', CACHE_COLLECTION_GENERATION_NAMESPACES.userApplications],
      ['users:work_history:*', CACHE_COLLECTION_GENERATION_NAMESPACES.userWorkHistory],
      ['orgs:list:*', CACHE_COLLECTION_GENERATION_NAMESPACES.organizationList],
      ['org:detail:*', CACHE_COLLECTION_GENERATION_NAMESPACES.organizationDetail],
      ['org:members:*', CACHE_COLLECTION_GENERATION_NAMESPACES.organizationMembers],
      ['user:pending_reviews:*', CACHE_COLLECTION_GENERATION_NAMESPACES.pendingReviews],
    ] as const

    for (const [pattern, namespace] of globalCases) {
      assert.equal(cacheGenerationNamespaceForPattern(pattern), namespace)
      assert.deepEqual(globalCacheGenerationNamespaces(namespace), [namespace])
    }

    const organizationCases = [
      ['task:user:*:org:org-1:*', CACHE_COLLECTION_GENERATION_NAMESPACES.userTasks],
      ['tasks:grouped:org:org-1:*', CACHE_COLLECTION_GENERATION_NAMESPACES.groupedTasks],
      ['tasks:timeline:org:org-1:*', CACHE_COLLECTION_GENERATION_NAMESPACES.timelineTasks],
      ['task:stats:org:org-1:*', CACHE_COLLECTION_GENERATION_NAMESPACES.taskStatistics],
      ['task:metadata:*:org:org-1*', CACHE_COLLECTION_GENERATION_NAMESPACES.taskMetadata],
      ['org:detail:org-1:*', CACHE_COLLECTION_GENERATION_NAMESPACES.organizationDetail],
      ['org:members:org:org-1:*', CACHE_COLLECTION_GENERATION_NAMESPACES.organizationMembers],
    ] as const

    for (const [pattern, namespace] of organizationCases) {
      assert.equal(
        cacheGenerationNamespaceForPattern(pattern),
        scopedCacheGenerationNamespace(namespace, 'org', 'org-1')
      )
      assert.deepEqual(organizationCacheGenerationNamespaces(namespace, 'org-1'), [
        namespace,
        `${namespace}:org:org-1`,
      ])
    }

    assert.equal(
      cacheGenerationNamespaceForPattern('task:user:user:user-1:*'),
      scopedCacheGenerationNamespace(
        CACHE_COLLECTION_GENERATION_NAMESPACES.userTasks,
        'user',
        'user-1'
      )
    )
    for (const [pattern, namespace] of [
      ['tasks:grouped:*:user:user-1:*', CACHE_COLLECTION_GENERATION_NAMESPACES.groupedTasks],
      ['tasks:timeline:*:user:user-1:*', CACHE_COLLECTION_GENERATION_NAMESPACES.timelineTasks],
      ['task:stats:*:user:user-1:*', CACHE_COLLECTION_GENERATION_NAMESPACES.taskStatistics],
    ] as const) {
      assert.equal(
        cacheGenerationNamespaceForPattern(pattern),
        scopedCacheGenerationNamespace(namespace, 'user', 'user-1')
      )
      assert.deepEqual(organizationUserCacheGenerationNamespaces(namespace, 'org-1', 'user-1'), [
        namespace,
        `${namespace}:org:org-1`,
        `${namespace}:user:user-1`,
      ])
    }
    assert.equal(
      cacheGenerationNamespaceForPattern('task:audit:task-1:*'),
      scopedCacheGenerationNamespace(
        CACHE_COLLECTION_GENERATION_NAMESPACES.taskAudit,
        'task',
        'task-1'
      )
    )
    assert.equal(
      cacheGenerationNamespaceForPattern('task:applications:*:taskId:task-1:*'),
      scopedCacheGenerationNamespace(
        CACHE_COLLECTION_GENERATION_NAMESPACES.taskApplications,
        'task',
        'task-1'
      )
    )
    assert.equal(
      cacheGenerationNamespaceForPattern('user:applications:*:userId:user-1*'),
      scopedCacheGenerationNamespace(
        CACHE_COLLECTION_GENERATION_NAMESPACES.userApplications,
        'user',
        'user-1'
      )
    )
    assert.equal(
      cacheGenerationNamespaceForPattern('users:work_history:user-1:*'),
      scopedCacheGenerationNamespace(
        CACHE_COLLECTION_GENERATION_NAMESPACES.userWorkHistory,
        'user',
        'user-1'
      )
    )
    assert.equal(
      cacheGenerationNamespaceForPattern('orgs:list:user:user-1:*'),
      scopedCacheGenerationNamespace(
        CACHE_COLLECTION_GENERATION_NAMESPACES.organizationList,
        'user',
        'user-1'
      )
    )
    assert.equal(
      cacheGenerationNamespaceForPattern('user:pending_reviews:*:userId:user-1'),
      scopedCacheGenerationNamespace(
        CACHE_COLLECTION_GENERATION_NAMESPACES.pendingReviews,
        'user',
        'user-1'
      )
    )
    assert.equal(
      cacheGenerationNamespaceForPattern('user:pending_reviews:*:userId:user-1*'),
      scopedCacheGenerationNamespace(
        CACHE_COLLECTION_GENERATION_NAMESPACES.pendingReviews,
        'user',
        'user-1'
      )
    )
    assert.deepEqual(
      organizationUserCacheGenerationNamespaces(
        CACHE_COLLECTION_GENERATION_NAMESPACES.userTasks,
        'org-1',
        'user-1'
      ),
      ['task:user', 'task:user:org:org-1', 'task:user:user:user-1']
    )
    assert.deepEqual(
      entityCacheGenerationNamespaces(
        CACHE_COLLECTION_GENERATION_NAMESPACES.taskAudit,
        'task',
        'task-1'
      ),
      [CACHE_COLLECTION_GENERATION_NAMESPACES.taskAudit, 'task:audit:task:task-1']
    )
    assert.deepEqual(
      entityCacheGenerationNamespaces(
        CACHE_COLLECTION_GENERATION_NAMESPACES.taskApplications,
        'task',
        'task-1'
      ),
      [CACHE_COLLECTION_GENERATION_NAMESPACES.taskApplications, 'task:applications:task:task-1']
    )
  })

  test('routes task-list invalidations to global fallback or tenant generation', ({ assert }) => {
    assert.equal(
      cacheGenerationNamespaceForPattern('tasks:list:*'),
      TASK_LIST_CACHE_GENERATION_NAMESPACE
    )
    assert.equal(
      cacheGenerationNamespaceForPattern(
        'tasks:list:v2:org:58cc330a-02cb-43cb-a3e3-d06848dfb7b2:*'
      ),
      taskListOrganizationCacheGenerationNamespace('58cc330a-02cb-43cb-a3e3-d06848dfb7b2')
    )
    assert.isNull(cacheGenerationNamespaceForPattern('task:detail:task-1:*'))
    assert.isNull(cacheGenerationNamespaceForPattern('tasks:list:v2:org:*:*'))
  })

  test('builds opaque control keys and preserves the logical prefix for compatibility', ({
    assert,
  }) => {
    const controlKey = cacheGenerationControlKey(TASK_LIST_CACHE_GENERATION_NAMESPACE)
    const scopedKey = buildGenerationScopedCacheKey(
      'tasks:list:v2:org:org-1:scope:all:query:digest',
      'generation-token'
    )

    assert.match(controlKey, /^generation:control:[a-f0-9]{64}$/)
    assert.notInclude(controlKey, TASK_LIST_CACHE_GENERATION_NAMESPACE)
    assert.equal(
      scopedKey,
      'tasks:list:v2:org:org-1:scope:all:query:digest:generation:generation-token'
    )
    assert.equal(
      buildGenerationScopedCacheKey('tasks:list:logical', ['global-token', 'org-token']),
      'tasks:list:logical:generation:global-token.org-token'
    )
  })

  test('rejects unbounded or unsafe generation namespaces', ({ assert }) => {
    for (const namespace of ['', 'Tasks:list', 'tasks list', 'tasks/list', `a${'x'.repeat(128)}`]) {
      assert.throws(() => assertCacheGenerationNamespace(namespace), /generation namespace/)
    }
    for (const organizationId of ['', 'ORG-1', 'org:1', 'org*', 'x'.repeat(65)]) {
      assert.throws(
        () => taskListOrganizationCacheGenerationNamespace(organizationId),
        /safe identifier/
      )
      assert.throws(() => taskListCacheGenerationNamespaces(organizationId), /safe identifier/)
      assert.throws(() => taskListCacheInvalidationPattern(organizationId), /safe identifier/)
      assert.throws(() => taskMetadataCacheInvalidationPattern(organizationId), /safe identifier/)
      assert.throws(() => reviewSessionCacheKey(organizationId), /safe identifier/)
      assert.throws(
        () =>
          organizationCacheGenerationNamespaces(
            CACHE_COLLECTION_GENERATION_NAMESPACES.userTasks,
            organizationId
          ),
        /safe identifier/
      )
      assert.throws(
        () =>
          organizationUserCacheGenerationNamespaces(
            CACHE_COLLECTION_GENERATION_NAMESPACES.userTasks,
            organizationId,
            'user-1'
          ),
        /safe identifier/
      )
      assert.throws(
        () =>
          organizationUserCacheGenerationNamespaces(
            CACHE_COLLECTION_GENERATION_NAMESPACES.userTasks,
            'org-1',
            organizationId
          ),
        /safe identifier/
      )
    }
    assert.isNull(cacheGenerationNamespaceForPattern('task:user:*:org:*:*'))
    assert.isNull(cacheGenerationNamespaceForPattern('task:applications:*:taskId:task:*:*'))
  })
})
