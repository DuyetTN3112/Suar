import { test } from '@japa/runner'

import { searchConfig } from '#config/search'
import { makeSystemProjectActionContext } from '#modules/projects/actions/project_action_context'
import GetProjectsListQuery from '#modules/projects/actions/queries/get_projects_list_query'

type ProjectListFilters = Parameters<
  NonNullable<ConstructorParameters<typeof GetProjectsListQuery>[2]>['paginateByUserAccess']
>[1]

test.group('Unit | Get Projects List Query', (group) => {
  group.each.setup(() => {
    searchConfig.enabled = true
  })

  test('uses engine project ids and clears SQL search when engine returns hits', async ({
    assert,
  }) => {
    const calls: string[] = []
    const rawTaskCounter = {
      countTasksByProjectIds: () => Promise.resolve(new Map()),
    }
    const taskCounter = rawTaskCounter as unknown as ConstructorParameters<typeof GetProjectsListQuery>[1]
    const repository = {
      paginateByUserAccess: (userId: string, filters: ProjectListFilters) => {
        calls.push(`repo:list:${JSON.stringify({ userId, filters })}`)
        return Promise.resolve({ data: [], total: 0 })
      },
      getStatsByUserAccess: () => Promise.resolve({
        total_projects: 0,
        active_projects: 0,
        completed_projects: 0,
      }),
      searchCandidateReader: {
        searchProjectCandidates: ({ q, limit }: { q: string; limit: number }) => {
          calls.push(`engine:${q}:${limit}`)
          return Promise.resolve([{ projectId: 'project-2' }, { projectId: 'project-1' }])
        },
      },
      countProjectMembers: () => Promise.resolve(new Map()),
    }
    const typedRepository = repository as unknown as ConstructorParameters<typeof GetProjectsListQuery>[2]

    const query = new GetProjectsListQuery(
      makeSystemProjectActionContext('owner-user'),
      taskCounter,
      typedRepository
    )

    await query.handle({
      page: 2,
      limit: 10,
      search: 'elastic',
      status: 'active',
    })

    assert.deepEqual(calls, [
      'engine:elastic:20',
      'repo:list:{"userId":"owner-user","filters":{"page":2,"limit":10,"project_ids":["project-2","project-1"],"status":"active"}}',
    ])
  })
})
