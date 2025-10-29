import { test } from '@japa/runner'

import { searchConfig } from '#config/search'
import GetAllOrganizationsQuery from '#modules/organizations/actions/queries/get_all_organizations_query'

test.group('Unit | Get All Organizations Query', (group) => {
  group.each.setup(() => {
    searchConfig.enabled = true
  })

  test('uses engine organization ids and skips SQL keyword search when engine returns hits', async ({
    assert,
  }) => {
    const calls: string[] = []

    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const deps: ConstructorParameters<typeof GetAllOrganizationsQuery>[0] = {
      searchCandidateReader: {
        searchOrganizationCandidates: ({ q, limit }: { q: string; limit: number }) => {
          calls.push(`engine:${q}:${limit}`)
          return Promise.resolve([{ organizationId: 'org-2' }, { organizationId: 'org-1' }])
        },
      },
      findActiveBasicListByIds: (ids: string[]) => {
        calls.push(`repo:ids:${ids.join(',')}`)
        return Promise.resolve(
          ids.map((id) => ({
            id,
            name: `Org ${id}`,
            description: null,
            logo: null,
            website: null,
          }))
        )
      },
      searchActiveBasicList: (rawQuery: string, limit: number) => {
        calls.push(`repo:search:${rawQuery}:${limit}`)
        return Promise.resolve([])
      },
    } as never

    const query = new GetAllOrganizationsQuery(deps)

    const result = await query.searchBasicList('elastic', 24)

    assert.deepEqual(calls, ['engine:elastic:24', 'repo:ids:org-2,org-1'])
    assert.deepEqual(
      result.map((item) => item.id),
      ['org-2', 'org-1']
    )
  })

  test('paginates organizations with engine-ranked ids for membership page', async ({ assert }) => {
    const calls: string[] = []

    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const deps: ConstructorParameters<typeof GetAllOrganizationsQuery>[0] = {
      searchCandidateReader: {
        searchOrganizationCandidates: ({ q, limit }: { q: string; limit: number }) => {
          calls.push(`engine:${q}:${limit}`)
          return Promise.resolve([{ organizationId: 'org-2' }, { organizationId: 'org-1' }])
        },
      },
      paginateActiveBasicList: (options: {
        page: number
        perPage: number
        search?: string
        organizationIds?: string[]
      }) => {
        calls.push(`repo:page:${JSON.stringify(options)}`)
        return Promise.resolve({
          organizations: [
            {
              id: 'org-2',
              name: 'Org 2',
              description: null,
              logo: null,
              website: null,
            },
            {
              id: 'org-1',
              name: 'Org 1',
              description: null,
              logo: null,
              website: null,
            },
          ],
          total: 2,
        })
      },
      findMembershipsByUser: () =>
        Promise.resolve([
          {
            organization_id: 'org-2',
            status: 'approved',
          },
        ]),
    } as never

    const query = new GetAllOrganizationsQuery(deps)

    const result = await query.getWithMembershipStatusPage({
      userId: 'user-1',
      page: 2,
      perPage: 12,
      search: 'elastic',
    })

    assert.deepEqual(calls, [
      'engine:elastic:24',
      'repo:page:{"page":2,"perPage":12,"organizationIds":["org-2","org-1"]}',
    ])
    assert.deepEqual(
      result.data.map((organization) => ({
        id: organization.id,
        membership_status: organization.membership_status,
      })),
      [
        { id: 'org-2', membership_status: 'approved' },
        { id: 'org-1', membership_status: null },
      ]
    )
    assert.deepInclude(result.meta, {
      total: 2,
      perPage: 12,
      currentPage: 2,
      lastPage: 1,
    })
  })
})
