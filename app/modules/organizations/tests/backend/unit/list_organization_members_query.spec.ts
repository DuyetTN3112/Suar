import { test } from '@japa/runner'

import { searchConfig } from '#config/search'
import ListOrganizationMembersQuery from '#modules/organizations/actions/current/members/queries/list_organization_members_query'
import OrganizationMemberRepository from '#modules/organizations/infra/current/repositories/organization_member_repository'

test.group('Unit | Organization Members List Query', (group) => {
  group.each.setup(() => {
    searchConfig.enabled = true
  })

  test('uses engine user ids and clears SQL search when engine returns hits', async ({
    assert,
  }) => {
    const calls: string[] = []
    const memberRepo = Object.assign(new OrganizationMemberRepository(), {
      listMembers: (
        organizationId: string,
        filters: { search?: string; orgRole?: string; status?: string; userIds?: string[] },
        page: number,
        perPage: number
      ) => {
        calls.push(`repo:list:${JSON.stringify({ organizationId, filters, page, perPage })}`)
        return Promise.resolve({ members: [], total: 0 })
      },
    }) as ConstructorParameters<typeof ListOrganizationMembersQuery>[1]
    const searchReader: ConstructorParameters<typeof ListOrganizationMembersQuery>[2] = {
      searchUserCandidates: ({ q, limit }: { q: string; limit: number }) => {
        calls.push(`engine:${q}:${limit}`)
        return Promise.resolve([{ userId: 'user-2' }, { userId: 'user-1' }])
      },
    }

    const query = new ListOrganizationMembersQuery(
      {
        userId: 'owner-user',
        organizationId: 'organization-1',
        ip: '0.0.0.0',
        userAgent: 'system',
      },
      memberRepo,
      searchReader
    )

    await query.handle({
      organizationId: 'organization-1',
      page: 2,
      perPage: 10,
      search: 'elastic',
      orgRole: 'org_admin',
      status: 'approved',
    })

    assert.deepEqual(calls, [
      'engine:elastic:50',
      'repo:list:{"organizationId":"organization-1","filters":{"orgRole":"org_admin","status":"approved","userIds":["user-2","user-1"]},"page":2,"perPage":10}',
    ])
  })
})
