import { test } from '@japa/runner'

import ListInvitationsQuery from '#actions/organization/invitations/queries/list_invitations_query'
import InviteUserCommand from '#actions/organizations/commands/invite_user_command'
import { InviteUserDTO } from '#actions/organizations/dtos/request/invite_user_dto'
import { OrganizationRole, OrganizationUserStatus } from '#constants/organization_constants'
import ForbiddenException from '#exceptions/forbidden_exception'
import OrganizationUserRepository from '#infra/organizations/repositories/organization_user_repository'
import AuditLog from '#models/mongo/audit_log'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  UserFactory,
  OrganizationFactory,
  OrganizationUserFactory,
  cleanupTestData,
} from '#tests/helpers/factories'

interface AuditLogEntry {
  action: string
  new_values?: Record<string, unknown>
}

async function getOrganizationAuditLogs(
  action: string,
  organizationId: string
): Promise<AuditLogEntry[]> {
  return (await AuditLog.find({
    action,
    entity_type: 'organization',
    entity_id: organizationId,
  })) as AuditLogEntry[]
}

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
    const inviteeEmail = invitee.email ?? 'invited_member@example.com'

    await new InviteUserCommand({
      userId: owner.id,
      ip: '127.0.0.1',
      userAgent: 'test',
      organizationId: org.id,
    }).execute(new InviteUserDTO(org.id, inviteeEmail, OrganizationRole.MEMBER))

    const membership = await OrganizationUserRepository.findMembership(org.id, invitee.id)
    assert.isNotNull(membership)
    if (membership === null) {
      return
    }

    assert.equal(membership.status, OrganizationUserStatus.PENDING)
    assert.equal(membership.invited_by, owner.id)
    assert.equal(membership.org_role, OrganizationRole.MEMBER)

    const auditLogs = await getOrganizationAuditLogs('invite', org.id)
    assert.lengthOf(auditLogs, 1)
    assert.equal(auditLogs[0]?.new_values?.invited_user_id, invitee.id)
    assert.equal(auditLogs[0]?.new_values?.status, OrganizationUserStatus.PENDING)
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

  test('pending admins cannot invite users and the command leaves no invitation audit trail', async ({
    assert,
  }) => {
    const { org } = await OrganizationFactory.createWithOwner()
    const pendingAdmin = await UserFactory.create({ email: 'pending_admin_inviter@example.com' })
    const invitee = await UserFactory.create({ email: 'blocked_invite@example.com' })
    const inviteeEmail = invitee.email ?? 'blocked_invite@example.com'

    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: pendingAdmin.id,
      org_role: OrganizationRole.ADMIN,
      status: OrganizationUserStatus.PENDING,
    })

    const command = new InviteUserCommand({
      userId: pendingAdmin.id,
      ip: '127.0.0.1',
      userAgent: 'test',
      organizationId: org.id,
    })

    await assert.rejects(
      () => command.execute(new InviteUserDTO(org.id, inviteeEmail, OrganizationRole.MEMBER)),
      ForbiddenException
    )

    assert.isNull(await OrganizationUserRepository.findMembership(org.id, invitee.id))

    const auditLogs = await getOrganizationAuditLogs('invite', org.id)
    assert.lengthOf(auditLogs, 0)
  })
})
