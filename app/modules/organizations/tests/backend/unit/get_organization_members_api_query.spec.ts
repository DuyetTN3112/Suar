import { test } from '@japa/runner'
import { DateTime } from 'luxon'

import { searchConfig } from '#config/search'
import GetOrganizationMembersApiQuery from '#modules/organizations/actions/queries/get_organization_members_api_query'
import type OrganizationRepository from '#modules/organizations/infra/repositories/read/organization_repository'

test.group('Unit | Get Organization Members API Query', (group) => {
  group.each.setup(() => {
    searchConfig.enabled = true
  })

  test('uses engine user ids and skips SQL search when engine returns hits', async ({
    assert,
  }) => {
    const calls: string[] = []
    const deps: ConstructorParameters<typeof GetOrganizationMembersApiQuery>[0] = {
      findOrganizationById: (organizationId) =>
        Promise.resolve({
          id: organizationId,
          name: 'Org',
          slug: 'org',
          description: null,
          logo: null,
          website: null,
          plan: null,
        owner_id: 'owner-1',
        custom_roles: [],
        partner_type: null,
          partner_verified_at: null,
          partner_verified_by: null,
          partner_verification_proof: null,
          partner_expires_at: null,
        partner_is_active: false,
        deleted_at: null,
        created_at: DateTime.now(),
        updated_at: DateTime.now(),
        } as unknown as Awaited<ReturnType<typeof OrganizationRepository.findById>>),
      findMembersWithUserByIds: (organizationId, userIds) => {
        calls.push(`repo:ids:${organizationId}:${userIds.join(',')}`)
        return Promise.resolve([])
      },
      findMembersWithUserBySearch: (organizationId, rawQuery) => {
        calls.push(`repo:search:${organizationId}:${rawQuery}`)
        return Promise.resolve([])
      },
      findMembersWithUser: (organizationId) => {
        calls.push(`repo:all:${organizationId}`)
        return Promise.resolve([])
      },
      searchCandidateReader: {
        searchUserCandidates: ({ q, limit }: { q: string; limit: number }) => {
          calls.push(`engine:${q}:${limit}`)
          return Promise.resolve([{ userId: 'user-2' }, { userId: 'user-1' }])
        },
      },
    }

    const query = new GetOrganizationMembersApiQuery(deps)

    await query.execute('11111111-1111-4111-8111-111111111111', 'elastic')

    assert.deepEqual(calls, [
      'engine:elastic:100',
      'repo:ids:11111111-1111-4111-8111-111111111111:user-2,user-1',
    ])
  })
})
