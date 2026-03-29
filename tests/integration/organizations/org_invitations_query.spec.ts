import { test } from '@japa/runner'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  UserFactory,
  OrganizationFactory,
  OrganizationUserFactory,
  cleanupTestData,
} from '#tests/helpers/factories'
import { OrganizationRole, OrganizationUserStatus } from '#constants/organization_constants'
import InviteUserCommand from '#actions/organizations/commands/invite_user_command'
import { InviteUserDTO } from '#actions/organizations/dtos/request/invite_user_dto'
import ListInvitationsQuery from '#actions/organization/invitations/queries/list_invitations_query'
import OrganizationUserRepository from '#infra/organizations/repositories/organization_user_repository'

test.group('Integration | Org Invitations Query', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('invite command creates a pending invited membership instead of writing to legacy invitation table', async ({
    assert,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const invitee = await UserFactory.create({ email: 'invited_member@example.com' })

    await new InviteUserCommand({
      userId: owner.id,
      ip: '127.0.0.1',
      userAgent: 'test',
      organizationId: org.id,
    }).execute(new InviteUserDTO(org.id, invitee.email, OrganizationRole.MEMBER))

    const membership = await OrganizationUserRepository.findMembership(org.id, invitee.id)
    assert.isNotNull(membership)
    if (membership === null) {
      return
    }

    assert.equal(membership.status, OrganizationUserStatus.PENDING)
    assert.equal(membership.invited_by, owner.id)
    assert.equal(membership.org_role, OrganizationRole.MEMBER)
  })

  test('lists only inviter-created pending memberships on the invitations page', async ({
    assert,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const invitee = await UserFactory.create({ email: 'listed_invite@example.com' })
    const selfRequester = await UserFactory.create({ email: 'self_request@example.com' })

    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: invitee.id,
      org_role: OrganizationRole.ADMIN,
      status: OrganizationUserStatus.PENDING,
      invited_by: owner.id,
    })
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: selfRequester.id,
      org_role: OrganizationRole.MEMBER,
      status: OrganizationUserStatus.PENDING,
      invited_by: null,
    })

    const result = await new ListInvitationsQuery({
      userId: owner.id,
      ip: '127.0.0.1',
      userAgent: 'test',
      organizationId: org.id,
    }).handle({
      page: 1,
      perPage: 20,
      search: 'listed_invite',
    })

    assert.equal(result.invitations.length, 1)
    assert.equal(result.invitations[0]?.email, invitee.email)
    assert.equal(result.invitations[0]?.status, 'pending')
    assert.equal(result.invitations[0]?.org_role, OrganizationRole.ADMIN)
    assert.equal(result.invitations[0]?.invited_by.username, owner.username)
    assert.equal(result.pagination.total, 1)
  })
})
