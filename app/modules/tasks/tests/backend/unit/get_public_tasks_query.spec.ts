import { test } from '@japa/runner'

import { searchConfig } from '#config/search'
import { GetPublicTasksDTO } from '#modules/tasks/actions/dtos/request/task_application_dtos'
import GetPublicTasksQuery from '#modules/tasks/actions/queries/get_public_tasks_query'
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

test.group('Unit | Get Public Tasks Query', (group) => {
  group.each.setup(() => {
    searchConfig.enabled = true
  })

  test('uses engine task ids and clears SQL keyword when engine returns hits', async ({
    assert,
  }) => {
    const calls: string[] = []

    const query = new GetPublicTasksQuery(anonymousTaskActionContext, {
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
      'repo:list:{"filters":{"keyword":null,"task_ids":["task-2","task-1"],"difficulty":null,"skill_categories":null,"skill_ids":null,"task_type":null,"business_domain":null,"problem_category":null,"role_in_task":null,"verification_method":null,"tech_stack":null,"domain_tags":null,"accepting_applications":null,"sort_by":"created_at","sort_order":"desc","page":2,"perPage":10},"userId":null}',
      'cache:set',
    ])
    assert.equal(result.meta.last_page, 1)
  })

  test('normalizes cached legacy pagination metadata', async ({ assert }) => {
    const query = new GetPublicTasksQuery(anonymousTaskActionContext, {
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
        searchPublicTaskCandidates: () => Promise.resolve([]),
      },
    })

    const result = await query.handle(new GetPublicTasksDTO({ page: 1, per_page: 10 }))

    assert.equal(result.meta.last_page, 1)
  })

  test('passes explicit task ids through the public listing contract', async ({ assert }) => {
    const calls: string[] = []

    const query = new GetPublicTasksQuery(anonymousTaskActionContext, {
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
      'repo:list:{"filters":{"keyword":null,"task_ids":["task-visible"],"difficulty":null,"skill_categories":null,"skill_ids":null,"task_type":null,"business_domain":null,"problem_category":null,"role_in_task":null,"verification_method":null,"tech_stack":null,"domain_tags":null,"accepting_applications":null,"sort_by":"created_at","sort_order":"desc","page":1,"perPage":1},"userId":null}',
      'cache:set',
    ])
  })

  test('passes skill categories through the public listing contract', async ({ assert }) => {
    const calls: string[] = []

    const query = new GetPublicTasksQuery(anonymousTaskActionContext, {
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
      })
    )

    assert.deepEqual(calls, [
      'repo:list:{"filters":{"keyword":null,"task_ids":null,"difficulty":null,"skill_categories":["technology","delivery"],"skill_ids":null,"task_type":null,"business_domain":null,"problem_category":null,"role_in_task":null,"verification_method":null,"tech_stack":null,"domain_tags":null,"accepting_applications":null,"sort_by":"created_at","sort_order":"desc","page":1,"perPage":10},"userId":null}',
      'cache:set',
    ])
  })

  test('bypasses cache for authenticated marketplace listings because role state affects UI', async ({
    assert,
  }) => {
    const calls: string[] = []

    const query = new GetPublicTasksQuery(makeSystemTaskActionContext('creator-user'), {
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
        searchPublicTaskCandidates: () => Promise.resolve([]),
      },
    })

    const result = await query.handle(new GetPublicTasksDTO({ page: 1, per_page: 10 }))

    assert.deepEqual(calls, [
      'repo:list:{"filters":{"keyword":null,"task_ids":null,"difficulty":null,"skill_categories":null,"skill_ids":null,"task_type":null,"business_domain":null,"problem_category":null,"role_in_task":null,"verification_method":null,"tech_stack":null,"domain_tags":null,"accepting_applications":null,"sort_by":"created_at","sort_order":"desc","page":1,"perPage":10},"userId":"creator-user"}',
    ])
    assert.equal((result.data[0] as { id: string }).id, 'fresh-task')
  })
})
