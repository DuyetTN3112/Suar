import { test } from '@japa/runner'

import { searchConfig } from '#config/search'
import { OrganizationRole } from '#modules/organizations/access/public_contracts/organization_constants'
import { GetOrganizationMembersDTO } from '#modules/organizations/members/actions/dtos/request/get_organization_members_dto'
import type { OrganizationMembershipRepository } from '#modules/organizations/members/actions/ports/outbound/organization_persistence'
import GetOrganizationMembersQuery from '#modules/organizations/members/actions/query/get_organization_members_query'

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
        getContext: () => Promise.resolve(null),
        paginateMembers: () => Promise.resolve({ data: [], total: 0 }),
      } as unknown as OrganizationMembershipRepository,
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
        resolveCacheKey: (namespaces, logicalKey) => {
          calls.push(`generation:${JSON.stringify(namespaces)}:${logicalKey}`)
          return Promise.resolve(`physical:${logicalKey}`)
        },
        getCache: () => Promise.resolve(null),
        setCache: () => {
          calls.push('cache:set')
          return Promise.resolve()
        },
        searchCandidateReader: {
          isEnabled: () => true,
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
      'generation:["org:members","org:members:org:organization-1"]:org:members:org:organization-1:page:2:limit:10:sort:joined_at:desc:search-hash:986051385feae5b9850804db2d701c0b029ad24f09bce340c12aee7a5c8a0391:status:active:include:activity',
      'engine:elastic:50',
      'repo:list:{"organizationId":"organization-1","options":{"page":2,"limit":10,"userIds":["user-2","user-1"],"statusFilter":"approved","include":["activity"]}}',
      'cache:set',
    ])
  })
})
