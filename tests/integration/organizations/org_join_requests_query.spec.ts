import { test } from '@japa/runner'

import ListJoinRequestsQuery from '#actions/organization/invitations/queries/list_join_requests_query'
import { OrganizationRole, OrganizationUserStatus } from '#constants/organization_constants'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  UserFactory,
  OrganizationFactory,
  OrganizationUserFactory,
  cleanupTestData,
} from '#tests/helpers/factories'

test.group('Integration | Org Join Requests Query', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('lists pending join requests for the current organization context', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const pendingUser = await UserFactory.create({ username: 'pending_member_query' })
    const invitedUser = await UserFactory.create({ username: 'invited_member_query' })
    const approvedUser = await UserFactory.create()

    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: pendingUser.id,
      org_role: OrganizationRole.MEMBER,
      status: OrganizationUserStatus.PENDING,
    })
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: invitedUser.id,
      org_role: OrganizationRole.MEMBER,
      status: OrganizationUserStatus.PENDING,
      invited_by: owner.id,
    })
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: approvedUser.id,
      org_role: OrganizationRole.MEMBER,
      status: OrganizationUserStatus.APPROVED,
    })

    const result = await new ListJoinRequestsQuery({
      userId: owner.id,
      ip: '127.0.0.1',
      userAgent: 'test',
      organizationId: org.id,
    }).handle({
      page: 1,
      perPage: 50,
      search: 'pending_member',
    })

    assert.equal(result.requests.length, 1)
    assert.equal(result.requests[0]?.user_id, pendingUser.id)
    assert.equal(result.requests[0]?.status, OrganizationUserStatus.PENDING)
    assert.equal(result.meta.total, 1)
  })
})
