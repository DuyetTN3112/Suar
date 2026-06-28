import { test } from '@japa/runner'

import { OrganizationRouteAccessReaderAdapter } from '#composition/organizations/access/adapters/organization_route_access_reader_adapter'
import type {
  OrganizationMembershipRecord,
  OrganizationMembershipRepository,
  OrganizationRecord,
  OrganizationReader,
} from '#modules/organizations/actions/ports/outbound/directory/organization_persistence'

function organizationRecord(input: object): OrganizationRecord {
  return input as OrganizationRecord
}

function membershipRecord(input: object): OrganizationMembershipRecord {
  return input as OrganizationMembershipRecord
}

function makeReader(overrides: Partial<OrganizationReader> = {}): OrganizationReader {
  return {
    findById: () => Promise.resolve(null),
    ...overrides,
  } as unknown as OrganizationReader
}

function makeMemberships(
  overrides: Partial<OrganizationMembershipRepository> = {}
): OrganizationMembershipRepository {
  return {
    find: () => Promise.resolve(null),
    findApprovedContext: () => Promise.resolve(null),
    findFirstApprovedContext: () => Promise.resolve(null),
    ...overrides,
  } as unknown as OrganizationMembershipRepository
}

test.group('OrganizationRouteAccessReaderAdapter', () => {
  test('delegates approved membership lookups without widening the middleware contract', async ({
    assert,
  }) => {
    const expected = {
      userId: 'user-1',
      organizationId: 'org-1',
      role: 'org_admin' as const,
    }
    const reader = new OrganizationRouteAccessReaderAdapter(
      makeReader(),
      makeMemberships({
        findApprovedContext: () => Promise.resolve(expected),
        findFirstApprovedContext: () => Promise.resolve(expected),
      })
    )

    assert.strictEqual(await reader.findApprovedMembership('org-1', 'user-1'), expected)
    assert.strictEqual(await reader.findFirstApprovedMembership('user-1'), expected)
  })

  test('allows an approved custom role only when the active organization grants permission', async ({
    assert,
  }) => {
    const reader = new OrganizationRouteAccessReaderAdapter(
      makeReader({
        findById: () =>
          Promise.resolve(
            organizationRecord({
              id: 'org-1',
              deleted_at: null,
              custom_roles: [
                {
                  name: 'cto',
                  permissions: ['can_view_all_projects'],
                },
              ],
            })
          ),
      }),
      makeMemberships({
        find: () =>
          Promise.resolve(
            membershipRecord({
              organization_id: 'org-1',
              user_id: 'user-1',
              org_role: 'cto',
              status: 'approved',
            })
          ),
      })
    )

    assert.isTrue(await reader.checkPermission('user-1', 'org-1', 'can_view_all_projects'))
    assert.isFalse(await reader.checkPermission('user-1', 'org-1', 'can_manage_billing'))
  })

  test('denies permission before loading the organization for a non-approved membership', async ({
    assert,
  }) => {
    let organizationRead = false
    const reader = new OrganizationRouteAccessReaderAdapter(
      makeReader({
        findById: () => {
          organizationRead = true
          return Promise.resolve(null)
        },
      }),
      makeMemberships({
        find: () =>
          Promise.resolve(
            membershipRecord({
              organization_id: 'org-1',
              user_id: 'user-1',
              org_role: 'org_admin',
              status: 'pending',
            })
          ),
      })
    )

    assert.isFalse(await reader.checkPermission('user-1', 'org-1', 'can_view_all_projects'))
    assert.isFalse(organizationRead)
  })
})
