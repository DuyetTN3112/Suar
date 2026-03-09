import { test } from '@japa/runner'

import { searchConfig } from '#config/search'
import { GetOrganizationMembersDTO } from '#modules/organizations/actions/dtos/request/get_organization_members_dto'
import GetOrganizationMembersQuery from '#modules/organizations/actions/queries/get_organization_members_query'
import { OrganizationRole } from '#modules/organizations/public_contracts/organization_constants'

test.group('Unit | Get Organization Members Query', (group) => {
  group.each.setup(() => {
    searchConfig.enabled = true
  })

  test('uses engine user ids and clears SQL search when engine returns hits', async ({
    assert,
  }) => {
    const calls: string[] = []

    const query = new GetOrganizationMembersQuery(
      {
        userId: 'admin-user',
        organizationId: 'organization-1',
        ip: '0.0.0.0',
        userAgent: 'system',
      },
      {
        getMembershipContext: () => Promise.resolve({
          userId: 'admin-user',
          organizationId: 'organization-1',
          role: OrganizationRole.ADMIN,
        }),
        paginateMembers: (organizationId, options) => {
          calls.push(`repo:list:${JSON.stringify({ organizationId, options })}`)
          return Promise.resolve({ data: [], total: 0 })
        },
        getCache: () => Promise.resolve(null),
        setCache: () => {
          calls.push('cache:set')
          return Promise.resolve()
        },
        searchCandidateReader: {
          searchUserCandidates: ({ q, limit }: { q: string; limit: number }) => {
            calls.push(`engine:${q}:${limit}`)
            return Promise.resolve([{ userId: 'user-2' }, { userId: 'user-1' }])
          },
        },
      }
    )

    const dto = GetOrganizationMembersDTO.fromFilters('organization-1', {
      page: 2,
      limit: 10,
      search: 'elastic',
      status_filter: 'active',
      include: ['activity'],
    })

    await query.execute(dto)

    assert.deepEqual(calls, [
      'engine:elastic:50',
      'repo:list:{"organizationId":"organization-1","options":{"page":2,"limit":10,"userIds":["user-2","user-1"],"statusFilter":"approved","include":["activity"]}}',
      'cache:set',
    ])
  })
})
