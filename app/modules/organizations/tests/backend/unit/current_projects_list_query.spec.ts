import { test } from '@japa/runner'

import { searchConfig } from '#config/search'
import ListProjectsQuery from '#modules/organizations/actions/current/projects/queries/list_projects_query'
import OrganizationProjectRepository from '#modules/organizations/infra/current/repositories/organization_project_repository'

test.group('Unit | Organization Current Projects List Query', (group) => {
  group.each.setup(() => {
    searchConfig.enabled = true
  })

  test('uses engine project ids and clears SQL search when engine returns hits', async ({
    assert,
  }) => {
    const calls: string[] = []
    const projectRepo = Object.assign(new OrganizationProjectRepository(), {
      listProjects: (
        organizationId: string,
        filters: { search?: string; status?: string; projectIds?: string[] },
        page: number,
        perPage: number
      ) => {
        calls.push(`repo:list:${JSON.stringify({ organizationId, filters, page, perPage })}`)
        return Promise.resolve({ projects: [], total: 0 })
      },
    }) as ConstructorParameters<typeof ListProjectsQuery>[1]
    const searchReader: ConstructorParameters<typeof ListProjectsQuery>[2] = {
      searchProjectCandidates: ({ q, limit }: { q: string; limit: number }) => {
        calls.push(`engine:${q}:${limit}`)
        return Promise.resolve([{ projectId: 'project-2' }, { projectId: 'project-1' }])
      },
    }

    const query = new ListProjectsQuery(
      {
        userId: 'owner-user',
        organizationId: 'organization-1',
        ip: '0.0.0.0',
        userAgent: 'system',
      },
      projectRepo,
      searchReader
    )

    await query.handle({
      page: 3,
      perPage: 5,
      search: 'search',
      status: 'active',
    })

    assert.deepEqual(calls, [
      'engine:search:15',
      'repo:list:{"organizationId":"organization-1","filters":{"status":"active","projectIds":["project-2","project-1"]},"page":3,"perPage":5}',
    ])
  })
})
