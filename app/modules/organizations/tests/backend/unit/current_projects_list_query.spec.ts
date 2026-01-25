import { test } from '@japa/runner'

import ListProjectsQuery from '#modules/organizations/projects/actions/query/list_projects_query'

test.group('Unit | Organization Current Projects List Query', () => {
  test('passes the organization-owned request to the project capability', async ({
    assert,
  }) => {
    const calls: string[] = []
    const projects: ConstructorParameters<typeof ListProjectsQuery>[1] = {
      list: (input) => {
        calls.push(`capability:list:${JSON.stringify(input)}`)
        return Promise.resolve({ projects: [], total: 0 })
      },
    }

    const query = new ListProjectsQuery(
      {
        userId: 'owner-user',
        organizationId: 'organization-1',
        ip: '0.0.0.0',
        userAgent: 'system',
      },
      projects
    )

    await query.handle({
      page: 3,
      perPage: 5,
      search: 'search',
      status: 'active',
    })

    assert.deepEqual(calls, [
      'capability:list:{"organizationId":"organization-1","actorId":"owner-user","page":3,"perPage":5,"search":"search","status":"active"}',
    ])
  })
})
