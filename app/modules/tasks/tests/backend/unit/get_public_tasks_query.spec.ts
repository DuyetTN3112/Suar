import { test } from '@japa/runner'

import { GetPublicTasksDTO } from '#modules/tasks/actions/dtos/request/task_application_dtos'
import GetPublicTasksQuery from '#modules/tasks/actions/queries/task-reading/get_public_tasks_query'
import {
  makeSystemTaskActionContext,
  type TaskActionContext,
} from '#modules/tasks/actions/task_action_context'

const anonymousTaskActionContext: TaskActionContext = {
  userId: null,
  ip: '0.0.0.0',
  userAgent: 'test',
  organizationId: null,
  requestId: null,
  traceId: null,
  workflowId: null,
}

const resolveLogicalCacheKey = (_namespaces: readonly string[], logicalKey: string) =>
  Promise.resolve(logicalKey)

test.group('Unit | Get Public Tasks Query', () => {
  test('uses engine task ids and clears SQL keyword when engine returns hits', async ({
    assert,
  }) => {
    const calls: string[] = []

    const query = new GetPublicTasksQuery(anonymousTaskActionContext, {
      resolveSkillIdsByCategoryCodes: () => Promise.resolve([]),
      resolveCacheKey: resolveLogicalCacheKey,
      getCache: () => Promise.resolve(null),
      setCache: () => {
        calls.push('cache:set')
        return Promise.resolve()
      },
      paginatePublicTasksAsRecords: (filters, userId) => {
        calls.push(`repo:list:${JSON.stringify({ filters, userId })}`)
        return Promise.resolve({
          data: [],
          meta: { total: 0, per_page: 10, current_page: 2, last_page: 0 },
        })
      },
      searchCandidateReader: {
        isEnabled: () => true,
        searchPublicTaskCandidates: ({ q, limit }: { q: string; limit: number }) => {
          calls.push(`engine:${q}:${limit}`)
          return Promise.resolve([{ taskId: 'task-2' }, { taskId: 'task-1' }])
        },
      },
    })

    const result = await query.handle(
      new GetPublicTasksDTO({
        page: 2,
        per_page: 10,
        keyword: 'elastic',
      })
    )

    assert.deepEqual(calls, [
      'engine:elastic:20',
      'repo:list:{"filters":{"keyword":null,"task_ids":["task-2","task-1"],"ranked_task_ids":["task-2","task-1"],"difficulty":null,"category_skill_ids":null,"skill_ids":null,"task_type":null,"business_domain":null,"problem_category":null,"role_in_task":null,"verification_method":null,"tech_stack":null,"domain_tags":null,"accepting_applications":null,"sort_by":"created_at","sort_order":"desc","page":2,"perPage":10},"userId":null}',
      'cache:set',
    ])
    assert.equal(result.meta.last_page, 1)
  })

  test('normalizes cached legacy pagination metadata', async ({ assert }) => {
    const query = new GetPublicTasksQuery(anonymousTaskActionContext, {
      resolveSkillIdsByCategoryCodes: () => Promise.resolve([]),
      resolveCacheKey: resolveLogicalCacheKey,
      getCache: () =>
        Promise.resolve({
          data: [],
          meta: { total: 0, per_page: 10, current_page: 1, last_page: 0 },
        }),
      setCache: () => Promise.resolve(),
      paginatePublicTasksAsRecords: () => {
        throw new Error('repo should not be called for cached result')
      },
      searchCandidateReader: {
        isEnabled: () => true,
        searchPublicTaskCandidates: () => Promise.resolve([]),
      },
    })

    const result = await query.handle(new GetPublicTasksDTO({ page: 1, per_page: 10 }))

    assert.equal(result.meta.last_page, 1)
  })

  test('uses a bounded digest key without exposing anonymous search input', async ({ assert }) => {
    const observedKeys: string[] = []
    const sensitiveKeyword = `email@example.com-${'x'.repeat(600)}`
    const query = new GetPublicTasksQuery(anonymousTaskActionContext, {
      resolveSkillIdsByCategoryCodes: () => Promise.resolve([]),
      resolveCacheKey: resolveLogicalCacheKey,
      getCache: (key) => {
        observedKeys.push(key)
        return Promise.resolve(null)
      },
      setCache: (key) => {
        observedKeys.push(key)
        return Promise.resolve()
      },
      paginatePublicTasksAsRecords: () =>
        Promise.resolve({
          data: [],
          meta: { total: 0, per_page: 10, current_page: 1, last_page: 1 },
        }),
      searchCandidateReader: {
        isEnabled: () => true,
        searchPublicTaskCandidates: () => Promise.resolve([]),
      },
    })

    await query.handle(new GetPublicTasksDTO({ keyword: sensitiveKeyword }))

    assert.lengthOf(observedKeys, 2)
    assert.equal(observedKeys[0], observedKeys[1])
    assert.match(observedKeys[0] ?? '', /^tasks:public:v3:query:[a-f0-9]{64}$/)
    assert.notInclude(observedKeys[0] ?? '', 'email@example.com')
    assert.isBelow(Buffer.byteLength(observedKeys[0] ?? '', 'utf8'), 100)
  })

  test('passes explicit task ids through the public listing contract', async ({ assert }) => {
    const calls: string[] = []

    const query = new GetPublicTasksQuery(anonymousTaskActionContext, {
      resolveSkillIdsByCategoryCodes: () => Promise.resolve([]),
      resolveCacheKey: resolveLogicalCacheKey,
      getCache: () => Promise.resolve(null),
      setCache: () => {
        calls.push('cache:set')
        return Promise.resolve()
      },
      paginatePublicTasksAsRecords: (filters, userId) => {
        calls.push(`repo:list:${JSON.stringify({ filters, userId })}`)
        return Promise.resolve({
          data: [],
          meta: { total: 0, per_page: 1, current_page: 1, last_page: 1 },
        })
      },
      searchCandidateReader: {
        isEnabled: () => true,
        searchPublicTaskCandidates: () => {
          throw new Error('engine should not run when no keyword is provided')
        },
      },
    })

    await query.handle(
      new GetPublicTasksDTO({
        page: 1,
        per_page: 1,
        task_ids: ['task-visible'],
      })
    )

    assert.deepEqual(calls, [
      'repo:list:{"filters":{"keyword":null,"task_ids":["task-visible"],"difficulty":null,"category_skill_ids":null,"skill_ids":null,"task_type":null,"business_domain":null,"problem_category":null,"role_in_task":null,"verification_method":null,"tech_stack":null,"domain_tags":null,"accepting_applications":null,"sort_by":"created_at","sort_order":"desc","page":1,"perPage":1},"userId":null}',
      'cache:set',
    ])
  })

  test('passes skill categories through the public listing contract', async ({ assert }) => {
    const calls: string[] = []

    const query = new GetPublicTasksQuery(anonymousTaskActionContext, {
      resolveSkillIdsByCategoryCodes: (categoryCodes) => {
        calls.push(`skills:resolve:${JSON.stringify(categoryCodes)}`)
        return Promise.resolve(['skill-technology', 'skill-delivery'])
      },
      resolveCacheKey: resolveLogicalCacheKey,
      getCache: () => Promise.resolve(null),
      setCache: () => {
        calls.push('cache:set')
        return Promise.resolve()
      },
      paginatePublicTasksAsRecords: (filters, userId) => {
        calls.push(`repo:list:${JSON.stringify({ filters, userId })}`)
        return Promise.resolve({
          data: [],
          meta: { total: 0, per_page: 10, current_page: 1, last_page: 1 },
        })
      },
      searchCandidateReader: {
        isEnabled: () => true,
        searchPublicTaskCandidates: () => {
          throw new Error('engine should not run when no keyword is provided')
        },
      },
    })

    await query.handle(
      new GetPublicTasksDTO({
        page: 1,
        per_page: 10,
        skill_categories: ['technology', 'delivery'],
        skill_ids: ['explicit-skill'],
      })
    )

    assert.deepEqual(calls, [
      'skills:resolve:["technology","delivery"]',
      'repo:list:{"filters":{"keyword":null,"task_ids":null,"difficulty":null,"category_skill_ids":["skill-technology","skill-delivery"],"skill_ids":["explicit-skill"],"task_type":null,"business_domain":null,"problem_category":null,"role_in_task":null,"verification_method":null,"tech_stack":null,"domain_tags":null,"accepting_applications":null,"sort_by":"created_at","sort_order":"desc","page":1,"perPage":10},"userId":null}',
      'cache:set',
    ])
  })

  test('passes the selected multi-label skill match mode to the authorized repository', async ({
    assert,
  }) => {
    let observedMatch: unknown = null
    const query = new GetPublicTasksQuery(anonymousTaskActionContext, {
      resolveSkillIdsByCategoryCodes: () => Promise.resolve([]),
      resolveCacheKey: () => Promise.resolve(null),
      getCache: () => Promise.resolve(null),
      setCache: () => Promise.resolve(),
      paginatePublicTasksAsRecords: (filters) => {
        observedMatch = (filters as typeof filters & { skill_match?: string }).skill_match
        return Promise.resolve({
          data: [],
          meta: { total: 0, per_page: 10, current_page: 1, last_page: 1 },
        })
      },
      searchCandidateReader: {
        isEnabled: () => true,
        searchPublicTaskCandidates: () => Promise.resolve([]),
      },
    })

    await query.handle(
      new GetPublicTasksDTO({
        skill_ids: ['skill-a', 'skill-b'],
        skill_match: 'all',
      })
    )

    assert.equal(observedMatch, 'all')
  })

  test('bypasses cache for authenticated marketplace listings because role state affects UI', async ({
    assert,
  }) => {
    const calls: string[] = []

    const query = new GetPublicTasksQuery(makeSystemTaskActionContext('creator-user'), {
      resolveSkillIdsByCategoryCodes: () => Promise.resolve([]),
      resolveCacheKey: () => {
        throw new Error('generation resolver should not be called for authenticated listing')
      },
      getCache: () => {
        calls.push('cache:get')
        throw new Error('cache should not be called for authenticated marketplace listing')
      },
      setCache: () => {
        calls.push('cache:set')
        return Promise.resolve()
      },
      paginatePublicTasksAsRecords: (filters, userId) => {
        calls.push(`repo:list:${JSON.stringify({ filters, userId })}`)
        return Promise.resolve({
          data: [{ id: 'fresh-task', can_review_applications: true }] as never,
          meta: { total: 1, per_page: 10, current_page: 1, last_page: 1 },
        })
      },
      searchCandidateReader: {
        isEnabled: () => true,
        searchPublicTaskCandidates: () => Promise.resolve([]),
      },
    })

    const result = await query.handle(new GetPublicTasksDTO({ page: 1, per_page: 10 }))

    assert.deepEqual(calls, [
      'repo:list:{"filters":{"keyword":null,"task_ids":null,"difficulty":null,"category_skill_ids":null,"skill_ids":null,"task_type":null,"business_domain":null,"problem_category":null,"role_in_task":null,"verification_method":null,"tech_stack":null,"domain_tags":null,"accepting_applications":null,"sort_by":"created_at","sort_order":"desc","page":1,"perPage":10},"userId":"creator-user"}',
    ])
    assert.equal((result.data[0] as { id: string }).id, 'fresh-task')
  })

  test('resolves one global generation key and reuses its physical key for read and fill', async ({
    assert,
  }) => {
    const calls: string[] = []

    const query = new GetPublicTasksQuery(anonymousTaskActionContext, {
      resolveSkillIdsByCategoryCodes: () => Promise.resolve([]),
      resolveCacheKey: (namespaces, logicalKey) => {
        calls.push(`resolve:${namespaces.join('|')}:${logicalKey}`)
        return Promise.resolve(`physical:${logicalKey}`)
      },
      getCache: (key) => {
        calls.push(`get:${key}`)
        return Promise.resolve(null)
      },
      setCache: (key) => {
        calls.push(`set:${key}`)
        return Promise.resolve()
      },
      paginatePublicTasksAsRecords: () => {
        calls.push('repo')
        return Promise.resolve({
          data: [],
          meta: { total: 0, per_page: 10, current_page: 1, last_page: 1 },
        })
      },
      searchCandidateReader: {
        isEnabled: () => true,
        searchPublicTaskCandidates: () => Promise.resolve([]),
      },
    })

    await query.handle(new GetPublicTasksDTO({ page: 1, per_page: 10 }))

    const logicalKey = calls[0]?.replace('resolve:tasks:public:', '') ?? ''
    assert.match(logicalKey, /^tasks:public:v3:query:[a-f0-9]{64}$/)
    assert.deepEqual(calls.slice(1), [
      `get:physical:${logicalKey}`,
      'repo',
      `set:physical:${logicalKey}`,
    ])
  })

  test('bypasses cache reads and writes when generation resolution is unavailable', async ({
    assert,
  }) => {
    const calls: string[] = []
    const query = new GetPublicTasksQuery(anonymousTaskActionContext, {
      resolveSkillIdsByCategoryCodes: () => Promise.resolve([]),
      resolveCacheKey: () => Promise.resolve(null),
      getCache: () => {
        calls.push('cache:get')
        return Promise.resolve(null)
      },
      setCache: () => {
        calls.push('cache:set')
        return Promise.resolve()
      },
      paginatePublicTasksAsRecords: () => {
        calls.push('repo')
        return Promise.resolve({
          data: [],
          meta: { total: 0, per_page: 10, current_page: 1, last_page: 0 },
        })
      },
      searchCandidateReader: {
        isEnabled: () => true,
        searchPublicTaskCandidates: () => Promise.resolve([]),
      },
    })

    const result = await query.handle(new GetPublicTasksDTO({ page: 1, per_page: 10 }))

    assert.deepEqual(calls, ['repo'])
    assert.equal(result.meta.last_page, 1)
  })
})
