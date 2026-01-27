import { test } from '@japa/runner'

import { ComposedUserAdministrationQueryFactory } from '#composition/factories/composed_user_administration_query_factory'
import { userAccountRepository } from '#composition/user_persistence_composition'
import type { SystemUserAdminAccessAuthorizer } from '#modules/users/actions/ports/outbound/system_user_admin_access_authorizer'
import type { UserOrganizationMembershipReaderWriter } from '#modules/users/actions/ports/outbound/user_external_dependencies'
import GetPendingApprovalUsersQuery from '#modules/users/actions/queries/get_pending_approval_users_query'
import GetUsersListQuery from '#modules/users/actions/queries/get_users_list_query'
import { makeSystemUserActionContext } from '#modules/users/actions/user_action_context'

const organizationMembership: UserOrganizationMembershipReaderWriter = {
  findOrganizationSummary: () => Promise.resolve(null),
  listMemberUserIds: () => Promise.resolve([]),
  findMembershipStatus: () => Promise.resolve(null),
  approveMembership: () => Promise.resolve(undefined),
  listPendingApprovalUsers: () =>
    Promise.resolve([
      {
        id: 'user-1',
        email: 'user@example.com',
        username: 'user',
        system_role: 'user',
        status: 'active',
        avatar_url: null,
        created_at: '2026-07-26T00:00:00.000Z',
      },
    ]),
  countPendingApprovalUsers: () => Promise.resolve(1),
}

const adminAccess: SystemUserAdminAccessAuthorizer = {
  authorize: () => Promise.resolve(),
  isAllowed: () => Promise.resolve(true),
}

test.group('User administration queries', () => {
  test('factory creates fresh context-bound user list queries', ({ assert }) => {
    const factory = new ComposedUserAdministrationQueryFactory(
      organizationMembership,
      userAccountRepository,
      adminAccess
    )
    const context = makeSystemUserActionContext('admin-1')
    const first = factory.makeUsersList(context)
    const second = factory.makeUsersList(context)

    assert.instanceOf(first, GetUsersListQuery)
    assert.notStrictEqual(first, second)
  })

  test('pending approval query remains a reusable stateless use case', async ({ assert }) => {
    const query = new GetPendingApprovalUsersQuery(
      {
        ...makeSystemUserActionContext('admin-1'),
        organizationId: 'organization-1',
      },
      organizationMembership,
      adminAccess
    )

    assert.lengthOf(await query.getList(), 1)
    assert.equal(await query.getCount(), 1)
  })
})
