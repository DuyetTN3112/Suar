import { test } from '@japa/runner'

import { taskExternalDeps } from '#composition/tasks/task-external-dependencies/task_external_dependencies_composition'
import GetTasksListDTO from '#modules/tasks/actions/dtos/request/get_tasks_list_dto'
import GetTasksListQuery from '#modules/tasks/actions/queries/task-reading/get_tasks_list_query'
import { makeSystemTaskActionContext } from '#modules/tasks/actions/task_action_context'

type TaskListReadRepository = ConstructorParameters<typeof GetTasksListQuery>[2]
type TaskListQueryDeps = NonNullable<
  ConstructorParameters<typeof GetTasksListQuery>[3]
>
type TaskListTestDependencies = TaskListReadRepository & TaskListQueryDeps

function makeQuery(
  context: ReturnType<typeof makeSystemTaskActionContext>,
  deps: TaskListTestDependencies
): GetTasksListQuery {
  return new GetTasksListQuery(
    context,
    taskExternalDeps,
    deps,
    deps
  )
}

test.group('Unit | Get Tasks List Query', () => {
  test('uses engine task ids and clears SQL search when engine returns hits', async ({
    assert,
  }) => {
    const calls: string[] = []
    type PaginateByOrganization = TaskListReadRepository['paginateByOrganization']
    const deps: TaskListTestDependencies = {
      searchCandidateReader: {
        isEnabled: () => true,
        searchOrganizationTaskCandidates: ({
          q,
          organizationId,
          limit,
        }: {
          q: string
          organizationId: string
          limit: number
        }) => {
          calls.push(`engine:${q}:${organizationId}:${limit}`)
          return Promise.resolve([{ taskId: 'task-2' }, { taskId: 'task-1' }])
        },
      },
      paginateByOrganization: (
        organizationId: Parameters<PaginateByOrganization>[0],
        filters: Parameters<PaginateByOrganization>[1],
        permissionFilter: Parameters<PaginateByOrganization>[2]
      ) => {
        calls.push(`repo:list:${JSON.stringify({ organizationId, filters, permissionFilter })}`)
        return Promise.resolve({
          data: [],
          meta: {
            total: 0,
            per_page: 10,
            current_page: 2,
            last_page: 0,
            first_page: 1,
            next_page_url: null,
            previous_page_url: null,
          },
        })
      },
      getListStatsByOrganization: () => Promise.resolve({ total: 0, by_status: {} }),
      resolvePermissionFilter: () => {
        calls.push('permission:resolved')
        return Promise.resolve({ type: 'all' })
      },
      resolveCacheKey: (generationNamespaces, logicalKey) => {
        calls.push(`generation:${JSON.stringify(generationNamespaces)}`)
        return Promise.resolve(`${logicalKey}:generation:stable-token`)
      },
      rememberCache: async (_key, ttl, callback, options) => {
        calls.push(`cache:remember:${ttl}:${String(options?.waitTimeoutMs)}`)
        return callback()
      },
    }

    const query = makeQuery(makeSystemTaskActionContext('owner-user'), deps)

    const result = await query.execute(
      new GetTasksListDTO({
        organization_id: 'organization-1',
        page: 2,
        limit: 10,
        search: 'elastic',
      })
    )

    assert.deepEqual(calls, [
      'permission:resolved',
      'generation:["tasks:list","tasks:list:org:organization-1"]',
      'cache:remember:180:1500',
      'engine:elastic:organization-1:20',
      'repo:list:{"organizationId":"organization-1","filters":{"task_ids":["task-2","task-1"],"sort_by":"due_date","sort_order":"asc","page":2,"limit":10},"permissionFilter":{"type":"all"}}',
    ])
    assert.equal(result.meta.last_page, 1)
  })

  test('normalizes cached legacy pagination metadata', async ({ assert }) => {
    const calls: string[] = []
    let cacheKey = ''
    const query = makeQuery(
      makeSystemTaskActionContext('owner-user'),
      {
        searchCandidateReader: {
          isEnabled: () => true,
          searchOrganizationTaskCandidates: () => Promise.resolve([]),
        },
        paginateByOrganization: () =>
          Promise.resolve({
            data: [],
            meta: {
              total: 0,
              per_page: 10,
              current_page: 1,
              last_page: 0,
              first_page: 1,
              next_page_url: null,
              previous_page_url: null,
            },
          }),
        getListStatsByOrganization: () => Promise.resolve({ total: 0, by_status: {} }),
        resolvePermissionFilter: () => {
          calls.push('permission:resolved')
          return Promise.resolve({ type: 'all' })
        },
        resolveCacheKey: (_namespace, logicalKey) =>
          Promise.resolve(`${logicalKey}:generation:stable-token`),
        rememberCache: <T>(
          key: string,
          _ttl: number,
          callback: () => Promise<T>
        ) => {
          calls.push('cache:remember')
          cacheKey = key
          return callback()
        },
      }
    )

    const result = await query.execute(
      new GetTasksListDTO({
        organization_id: 'organization-1',
        page: 1,
        limit: 10,
      })
    )

    assert.equal(result.meta.last_page, 1)
    assert.deepEqual(calls, ['permission:resolved', 'cache:remember'])
    assert.include(cacheKey, 'tasks:list:v2:org:organization-1:scope:all:query:')
    assert.isTrue(cacheKey.endsWith(':generation:stable-token'))
  })

  test('bypasses optional cache reads and writes when generation resolution is unavailable', async ({
    assert,
  }) => {
    const calls: string[] = []
    const query = makeQuery(
      makeSystemTaskActionContext('owner-user'),
      {
        searchCandidateReader: {
          isEnabled: () => true,
          searchOrganizationTaskCandidates: () => Promise.resolve([]),
        },
        paginateByOrganization: () =>
          Promise.resolve({
            data: [],
            meta: {
              total: 0,
              per_page: 10,
              current_page: 1,
              last_page: 0,
              first_page: 1,
              next_page_url: null,
              previous_page_url: null,
            },
          }),
        getListStatsByOrganization: () => Promise.resolve({ total: 0, by_status: {} }),
        resolvePermissionFilter: () => {
          calls.push('permission:resolved')
          return Promise.resolve({ type: 'all' })
        },
        resolveCacheKey: () => {
          calls.push('generation:unavailable')
          return Promise.resolve(null)
        },
        rememberCache: () => {
          calls.push('cache:remember:unexpected')
          throw new Error('cache remember must not run without a physical key')
        },
        executeSingleFlight: async (_key, callback) => {
          calls.push('single-flight:bypass')
          return callback()
        },
      }
    )

    const result = await query.execute(
      new GetTasksListDTO({
        organization_id: 'organization-1',
        page: 1,
        limit: 10,
      })
    )

    assert.deepEqual(calls, [
      'permission:resolved',
      'generation:unavailable',
      'single-flight:bypass',
    ])
    assert.deepEqual(result.data, [])
    assert.equal(result.meta.last_page, 1)
  })

  test('uses one immutable physical key for the complete read-through cycle', async ({
    assert,
  }) => {
    const cacheKeys: string[] = []
    const physicalKey =
      'tasks:list:v2:org:organization-1:scope:all:query:digest:generation:immutable-token'
    const query = makeQuery(
      makeSystemTaskActionContext('owner-user'),
      {
        searchCandidateReader: {
          isEnabled: () => true,
          searchOrganizationTaskCandidates: () => Promise.resolve([]),
        },
        paginateByOrganization: () =>
          Promise.resolve({
            data: [],
            meta: {
              total: 0,
              per_page: 10,
              current_page: 1,
              last_page: 0,
              first_page: 1,
              next_page_url: null,
              previous_page_url: null,
            },
          }),
        getListStatsByOrganization: () => Promise.resolve({ total: 0, by_status: {} }),
        resolvePermissionFilter: () => Promise.resolve({ type: 'all' }),
        resolveCacheKey: () => Promise.resolve(physicalKey),
        rememberCache: async (key, _ttl, callback) => {
          cacheKeys.push(key)
          return callback()
        },
      }
    )

    await query.execute(
      new GetTasksListDTO({
        organization_id: 'organization-1',
        page: 1,
        limit: 10,
      })
    )

    assert.deepEqual(cacheKeys, [physicalKey])
  })

  test('coalesces concurrent source reads locally while cache generation is unavailable', async ({
    assert,
  }) => {
    let paginateCalls = 0
    let statsCalls = 0
    const query = makeQuery(
      makeSystemTaskActionContext('owner-user'),
      {
        searchCandidateReader: {
          isEnabled: () => true,
          searchOrganizationTaskCandidates: () => Promise.resolve([]),
        },
        paginateByOrganization: async () => {
          paginateCalls++
          await new Promise((resolve) => setTimeout(resolve, 20))

          return {
            data: [],
            meta: {
              total: 0,
              per_page: 10,
              current_page: 1,
              last_page: 0,
              first_page: 1,
              next_page_url: null,
              previous_page_url: null,
            },
          }
        },
        getListStatsByOrganization: () => {
          statsCalls++
          return Promise.resolve({ total: 0, by_status: {} })
        },
        resolvePermissionFilter: () => Promise.resolve({ type: 'all' }),
        resolveCacheKey: () => Promise.resolve(null),
      }
    )
    const dto = new GetTasksListDTO({
      organization_id: 'organization-1',
      page: 1,
      limit: 10,
    })

    const results = await Promise.all(Array.from({ length: 50 }, () => query.execute(dto)))

    assert.lengthOf(results, 50)
    assert.equal(paginateCalls, 1)
    assert.equal(statsCalls, 1)
  })
})
