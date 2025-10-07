import { test } from '@japa/runner'

import { searchConfig } from '#config/search'
import { makeSystemAdminActionContext } from '#modules/admin/actions/admin_action_context'
import ListOrganizationsQuery, {
  type ListOrganizationsDTO,
} from '#modules/admin/actions/organizations/queries/list_organizations_query'
import { AdminOrganizationReadOps } from '#modules/admin/infra/repositories/read/admin_organization_queries'
import { PartnerType } from '#modules/organizations/public_contracts/organization_constants'

test.group('Unit | Admin List Organizations Query', (group) => {
  group.each.setup(() => {
    searchConfig.enabled = true
  })

  test('uses engine organization ids and clears SQL search when engine returns hits', async ({
    assert,
  }) => {
    const calls: string[] = []
    let repoCallCount = 0
    const orgRepo: ConstructorParameters<typeof ListOrganizationsQuery>[1] = {
      ...AdminOrganizationReadOps,
      listOrganizations: (filters: {
        search?: string
        partnerType?: PartnerType
        organizationIds?: string[]
      }, page: number, perPage: number) => {
        repoCallCount += 1
        calls.push(`repo:list:${JSON.stringify({ filters, page, perPage })}`)
        return Promise.resolve({
          organizations: repoCallCount === 1 ? ([{
            id: 'org-2',
            name: 'Elastic Org',
            slug: 'elastic-org',
            description: null,
            owner_id: 'owner-1',
            owner: { id: 'owner-1', username: 'owner', email: 'owner@example.com' },
            partner_type: PartnerType.GOLD,
            partner_is_active: true,
            created_at: { toISO: () => '2026-07-01T00:00:00.000Z' },
            updated_at: { toISO: () => '2026-07-01T00:00:00.000Z' },
            $extras: { users_count: 2, projects_count: 1 },
          }] as unknown as Awaited<ReturnType<typeof AdminOrganizationReadOps.listOrganizations>>['organizations'])
            : [],
          total: repoCallCount === 1 ? 1 : 0,
        })
      },
    }
    const searchReader: ConstructorParameters<typeof ListOrganizationsQuery>[2] = {
      searchOrganizationCandidates: ({ q, limit }: { q: string; limit: number }) => {
        calls.push(`engine:${q}:${limit}`)
        return Promise.resolve([{ organizationId: 'org-2' }, { organizationId: 'org-1' }])
      },
    }

    const query = new ListOrganizationsQuery(
      makeSystemAdminActionContext('admin-user'),
      orgRepo,
      searchReader
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
    const orgRepo: ConstructorParameters<typeof ListOrganizationsQuery>[1] = {
      ...AdminOrganizationReadOps,
      listOrganizations: (filters: {
        search?: string
        partnerType?: PartnerType
        organizationIds?: string[]
      }, page: number, perPage: number) => {
        calls.push(`repo:list:${JSON.stringify({ filters, page, perPage })}`)
        return Promise.resolve({ organizations: [], total: 0 })
      },
    }
    const searchReader: ConstructorParameters<typeof ListOrganizationsQuery>[2] = {
      searchOrganizationCandidates: ({ q, limit }: { q: string; limit: number }) => {
        calls.push(`engine:${q}:${limit}`)
        return Promise.resolve([{ organizationId: 'stale-org-1' }])
      },
    }

    const query = new ListOrganizationsQuery(
      makeSystemAdminActionContext('admin-user'),
      orgRepo,
      searchReader
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
