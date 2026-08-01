import { test } from '@japa/runner'

import { makeSystemAdminActionContext } from '#modules/admin/organizations/actions/action_context'
import ListOrganizationsQuery, {
  type ListOrganizationsDTO,
} from '#modules/admin/organizations/actions/query/list_organizations_query'
import { PartnerType } from '#modules/organizations/access/public_contracts/organization_constants'

test.group('Unit | Admin List Organizations Query', () => {
  test('uses engine organization ids and clears SQL search when engine returns hits', async ({
    assert,
  }) => {
    const calls: string[] = []
    let repoCallCount = 0
    const orgRepo: ConstructorParameters<typeof ListOrganizationsQuery>[2] = {
      getOrganizationStats: () =>
        Promise.resolve({ total: 0, newThisMonth: 0 }),
      findById: () => Promise.resolve(null),
      listOrganizations: (filters: {
        search?: string
        partnerType?: PartnerType
        organizationIds?: string[]
      }, page: number, perPage: number) => {
        repoCallCount += 1
        calls.push(`repo:list:${JSON.stringify({ filters, page, perPage })}`)
        return Promise.resolve({
          organizations:
            repoCallCount === 1
              ? [
                  {
                    id: 'org-2',
                    name: 'Elastic Org',
                    slug: 'elastic-org',
                    description: null,
                    ownerId: 'owner-1',
                    owner: { id: 'owner-1', username: 'owner', email: 'owner@example.com' },
                    partnerType: PartnerType.GOLD,
                    partnerIsActive: true,
                    createdAt: '2026-07-01T00:00:00.000Z',
                    updatedAt: '2026-07-01T00:00:00.000Z',
                    usersCount: 2,
                    projectsCount: 1,
                  },
                ]
              : [],
          total: repoCallCount === 1 ? 1 : 0,
        })
      },
    }
    const searchReader: ConstructorParameters<typeof ListOrganizationsQuery>[1] = {
      isEnabled: () => true,
      searchOrganizationCandidates: ({ q, limit }: { q: string; limit: number }) => {
        calls.push(`engine:${q}:${limit}`)
        return Promise.resolve([{ organizationId: 'org-2' }, { organizationId: 'org-1' }])
      },
    }

    const query = new ListOrganizationsQuery(
      makeSystemAdminActionContext('admin-user'),
      searchReader,
      orgRepo
    )

    await query.handle({
      page: 1,
      perPage: 24,
      search: 'elastic',
      partnerType: PartnerType.GOLD,
    } satisfies ListOrganizationsDTO)

    assert.deepEqual(calls, [
      'engine:elastic:24',
      'repo:list:{"filters":{"partnerType":"gold","organizationIds":["org-2","org-1"]},"page":1,"perPage":24}',
    ])
  })

  test('falls back to SQL search when engine candidate ids do not resolve to active organizations', async ({
    assert,
  }) => {
    const calls: string[] = []
    const orgRepo: ConstructorParameters<typeof ListOrganizationsQuery>[2] = {
      getOrganizationStats: () =>
        Promise.resolve({ total: 0, newThisMonth: 0 }),
      findById: () => Promise.resolve(null),
      listOrganizations: (filters: {
        search?: string
        partnerType?: PartnerType
        organizationIds?: string[]
      }, page: number, perPage: number) => {
        calls.push(`repo:list:${JSON.stringify({ filters, page, perPage })}`)
        return Promise.resolve({ organizations: [], total: 0 })
      },
    }
    const searchReader: ConstructorParameters<typeof ListOrganizationsQuery>[1] = {
      isEnabled: () => true,
      searchOrganizationCandidates: ({ q, limit }: { q: string; limit: number }) => {
        calls.push(`engine:${q}:${limit}`)
        return Promise.resolve([{ organizationId: 'stale-org-1' }])
      },
    }

    const query = new ListOrganizationsQuery(
      makeSystemAdminActionContext('admin-user'),
      searchReader,
      orgRepo
    )

    await query.handle({
      page: 1,
      perPage: 24,
      search: 'elastic',
      partnerType: PartnerType.GOLD,
    } satisfies ListOrganizationsDTO)

    assert.deepEqual(calls, [
      'engine:elastic:24',
      'repo:list:{"filters":{"partnerType":"gold","organizationIds":["stale-org-1"]},"page":1,"perPage":24}',
      'repo:list:{"filters":{"search":"elastic","partnerType":"gold"},"page":1,"perPage":24}',
    ])
  })
})
