import { test } from '@japa/runner'

import { searchConfig } from '#config/search'
import GetTasksListDTO from '#modules/tasks/actions/dtos/request/get_tasks_list_dto'
import GetTasksListQuery from '#modules/tasks/actions/queries/get_tasks_list_query'
import { makeSystemTaskActionContext } from '#modules/tasks/actions/task_action_context'
import type { TaskPermissionFilter } from '#modules/tasks/infra/repositories/read/task_read_query_helpers'

test.group('Unit | Get Tasks List Query', (group) => {
  group.each.setup(() => {
    searchConfig.enabled = true
  })

  test('uses engine task ids and clears SQL search when engine returns hits', async ({
    assert,
  }) => {
    const calls: string[] = []
    type PaginateByOrganization = NonNullable<
      NonNullable<ConstructorParameters<typeof GetTasksListQuery>[2]>['paginateByOrganization']
    >
    const deps: ConstructorParameters<typeof GetTasksListQuery>[2] = {
      searchCandidateReader: {
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
      paginateByOrganization: ((
        organizationId: Parameters<PaginateByOrganization>[0],
        filters: Parameters<PaginateByOrganization>[1],
        permissionFilter: Parameters<PaginateByOrganization>[2]
      ) => {
        calls.push(`repo:list:${JSON.stringify({ organizationId, filters, permissionFilter })}`)
        return Promise.resolve({
          all: () => [],
          total: 0,
          perPage: 10,
          currentPage: 2,
          lastPage: 0,
          firstPage: 1,
          getNextPageUrl: () => null,
          getPreviousPageUrl: () => null,
        })
      }) as unknown as PaginateByOrganization,
      getListStatsByOrganization: () => Promise.resolve({ total: 0, by_status: {} }),
      resolvePermissionFilter: () => {
        calls.push('permission:resolved')
        return Promise.resolve({ scope: 'all' } as unknown as TaskPermissionFilter)
      },
      getCache: () => Promise.resolve(null),
      setCache: () => {
        calls.push('cache:set')
        return Promise.resolve()
      },
    }

    const query = new GetTasksListQuery(
      makeSystemTaskActionContext('owner-user'),
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      {} as never,
      deps
    )

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
      'engine:elastic:organization-1:20',
      'repo:list:{"organizationId":"organization-1","filters":{"task_ids":["task-2","task-1"],"sort_by":"due_date","sort_order":"asc","page":2,"limit":10},"permissionFilter":{"scope":"all"}}',
      'cache:set',
    ])
    assert.equal(result.meta.last_page, 1)
  })

  test('normalizes cached legacy pagination metadata', async ({ assert }) => {
    const query = new GetTasksListQuery(
      makeSystemTaskActionContext('owner-user'),
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      {} as never,
      {
        searchCandidateReader: {
          searchOrganizationTaskCandidates: () => Promise.resolve([]),
        },
        paginateByOrganization: () => {
          throw new Error('repo should not be called for cached result')
        },
        getListStatsByOrganization: () => Promise.resolve({ total: 0, by_status: {} }),
        resolvePermissionFilter: () => Promise.resolve({ scope: 'all' } as unknown as TaskPermissionFilter),
        getCache: () =>
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
        setCache: () => Promise.resolve(),
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
  })
})
