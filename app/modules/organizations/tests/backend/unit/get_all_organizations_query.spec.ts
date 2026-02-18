import { test } from '@japa/runner'

import type { OrganizationUserReaderWriter } from '#modules/organizations/directory/actions/ports/outbound/organization_external_dependencies'
import type {
  OrganizationMembershipRecord,
  OrganizationMembershipRepository,
  OrganizationRecord,
  OrganizationReader,
} from '#modules/organizations/directory/actions/ports/outbound/organization_persistence'
import GetAllOrganizationsQuery, {
  type GetAllOrganizationsQueryDeps,
} from '#modules/organizations/directory/actions/query/get_all_organizations_query'

const unusedUserReaderWriter: OrganizationUserReaderWriter = {
  findOwnerNamesByIds: () => Promise.resolve([]),
  findUserIdentity: () => Promise.resolve(null),
  findUserByEmail: () => Promise.resolve(null),
  isActiveUser: () => Promise.resolve(false),
  isSystemSuperadmin: () => Promise.resolve(false),
  updateCurrentOrganization: () => Promise.resolve(),
  loadDebugOrganizations: () =>
    Promise.resolve({
      id: '',
      username: null,
      currentOrganizationId: null,
      organizations: [],
    }),
}
const unusedOrganizations = {
  findAllActive: () => Promise.resolve([]),
  findAllActiveBasicList: () => Promise.resolve([]),
  findActiveBasicListByIds: () => Promise.resolve([]),
  paginateActiveBasicList: () => Promise.resolve({ organizations: [], total: 0 }),
  searchActiveBasicList: () => Promise.resolve([]),
} as unknown as OrganizationReader
const unusedMemberships = {
  listByUser: () => Promise.resolve([]),
  countMembersByOrganizationIds: () => Promise.resolve(new Map()),
} as unknown as OrganizationMembershipRepository

function makeOrganizationRecord(id: string): OrganizationRecord {
  return {
    id,
    name: `Org ${id}`,
    slug: id,
    description: null,
    logo: null,
    website: null,
    plan: null,
    owner_id: `owner-${id}`,
    custom_roles: null,
    partner_type: null,
    partner_verified_at: null,
    partner_verified_by: null,
    partner_verification_proof: null,
    partner_expires_at: null,
    partner_is_active: null,
    deleted_at: null,
    created_at: null,
    updated_at: null,
  }
}

function makeMembershipRecord(
  organizationId: string,
  status: string
): OrganizationMembershipRecord {
  return {
    organization_id: organizationId,
    user_id: 'user-1',
    org_role: 'org_member',
    status,
    invited_by: null,
    created_at: new Date('2026-07-31T00:00:00.000Z'),
    updated_at: new Date('2026-07-31T00:00:00.000Z'),
  }
}

test.group('Unit | Get All Organizations Query', () => {
  test('uses engine organization ids and skips SQL keyword search when engine returns hits', async ({
    assert,
  }) => {
    const calls: string[] = []

    const deps: Partial<GetAllOrganizationsQueryDeps> = {
      searchCandidateReader: {
        isEnabled: () => true,
        searchOrganizationCandidates: ({ q, limit }: { q: string; limit: number }) => {
          calls.push(`engine:${q}:${limit}`)
          return Promise.resolve([{ organizationId: 'org-2' }, { organizationId: 'org-1' }])
        },
      },
      findActiveBasicListByIds: (ids: string[]) => {
        calls.push(`repo:ids:${ids.join(',')}`)
        return Promise.resolve(ids.map((id) => makeOrganizationRecord(id)))
      },
      searchActiveBasicList: (rawQuery: string, limit: number) => {
        calls.push(`repo:search:${rawQuery}:${limit}`)
        return Promise.resolve([])
      },
    }

    const query = new GetAllOrganizationsQuery(
      unusedUserReaderWriter,
      unusedOrganizations,
      unusedMemberships,
      deps
    )

    const result = await query.searchBasicList('elastic', 24)

    assert.deepEqual(calls, ['engine:elastic:24', 'repo:ids:org-2,org-1'])
    assert.deepEqual(
      result.map((item) => item.id),
      ['org-2', 'org-1']
    )
  })

  test('does not misclassify a PostgreSQL read failure as a search-engine fallback', async ({
    assert,
  }) => {
    const calls: string[] = []

    const deps: Partial<GetAllOrganizationsQueryDeps> = {
      searchCandidateReader: {
        isEnabled: () => true,
        searchOrganizationCandidates: () => Promise.resolve([{ organizationId: 'org-1' }]),
      },
      findActiveBasicListByIds: () => {
        calls.push('repo:ids')
        return Promise.reject(new Error('organization repository unavailable'))
      },
      searchActiveBasicList: () => {
        calls.push('repo:fallback')
        return Promise.resolve([])
      },
    }

    const query = new GetAllOrganizationsQuery(
      unusedUserReaderWriter,
      unusedOrganizations,
      unusedMemberships,
      deps
    )

    await assert.rejects(
      () => query.searchBasicList('elastic'),
      /organization repository unavailable/
    )
    assert.deepEqual(calls, ['repo:ids'])
  })

  test('paginates organizations with engine-ranked ids for membership page', async ({ assert }) => {
    const calls: string[] = []

    const deps: Partial<GetAllOrganizationsQueryDeps> = {
      searchCandidateReader: {
        isEnabled: () => true,
        searchOrganizationCandidates: ({ q, limit }: { q: string; limit: number }) => {
          calls.push(`engine:${q}:${limit}`)
          return Promise.resolve([{ organizationId: 'org-2' }, { organizationId: 'org-1' }])
        },
      },
      paginateActiveBasicList: (options) => {
        calls.push(`repo:page:${JSON.stringify(options)}`)
        return Promise.resolve({
          organizations: [
            makeOrganizationRecord('org-2'),
            makeOrganizationRecord('org-1'),
          ],
          total: 2,
        })
      },
      findMembershipsByUser: () =>
        Promise.resolve([makeMembershipRecord('org-2', 'approved')]),
    }

    const query = new GetAllOrganizationsQuery(
      unusedUserReaderWriter,
      unusedOrganizations,
      unusedMemberships,
      deps
    )

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
