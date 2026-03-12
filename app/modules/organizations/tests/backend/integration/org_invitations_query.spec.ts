import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import { makeInviteUserCommand } from '#composition/organization_notification_composition'
import { organizationAdministrationRepository } from '#composition/organization_persistence_composition'
import AuditLog from '#modules/audit/infra/models/audit_log'
import { ForbiddenPolicyViolationException } from '#modules/authorization/public_contracts/policy_violation'
import { OrganizationRole, OrganizationUserStatus } from '#modules/organizations/access/public_contracts/organization_constants'
import { InviteUserDTO } from '#modules/organizations/invitations/actions/dtos/request/invite_user_dto'
import ListInvitationsQuery from '#modules/organizations/invitations/actions/query/list_invitations_query'
import * as membershipQueries from '#modules/organizations/members/infra/repositories/organization_user_repository/read/membership_queries'
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

async function countPlatformAuditEvents(
  action: string,
  entityType: string,
  entityId: string
): Promise<number> {
  const result = (await db.from('audit_events')
    .where('action', action)
    .where('entity_type', entityType)
    .where('entity_id', entityId)
    .count('* as count')) as { count: number | string }[]

  return Number(result[0]?.count ?? 0)
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

    await makeInviteUserCommand({
      userId: owner.id,
      ip: '127.0.0.1',
      userAgent: 'test',
      organizationId: org.id,
    }).execute(new InviteUserDTO(org.id, inviteeEmail, OrganizationRole.MEMBER))

    const membership = await membershipQueries.findMembership(org.id, invitee.id)
    assert.isNotNull(membership)
    if (membership === null) {
      return
    }

    assert.equal(membership.status, OrganizationUserStatus.PENDING)
    assert.equal(membership.invited_by, owner.id)
    assert.equal(membership.org_role, OrganizationRole.MEMBER)

    const auditLogs = await getOrganizationAuditLogs('invite', org.id)
    assert.lengthOf(auditLogs, 1)
    assert.equal(auditLogs[0]?.new_values?.['invited_user_id'], invitee.id)
    assert.equal(auditLogs[0]?.new_values?.['status'], OrganizationUserStatus.PENDING)
    assert.equal(
      await countPlatformAuditEvents(
        'organization.invitation.completed',
        'organization_invitation',
        invitee.id
      ),
      1
    )
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

    const result = await new ListInvitationsQuery(
      {
        userId: owner.id,
        ip: '127.0.0.1',
        userAgent: 'test',
        organizationId: org.id,
      },
      organizationAdministrationRepository
    ).handle({
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

  test('orders tied invitation rows by user_id desc', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const olderId = '00000000-0000-4000-8000-000000000301'
    const newerId = '00000000-0000-4000-8000-0000000003ff'
    const sharedCreatedAt = new Date('2026-07-01T13:00:00.000Z')

    const olderInvitee = await UserFactory.create({
      id: olderId,
      email: 'pagination_invite_low@example.com',
    })
    const newerInvitee = await UserFactory.create({
      id: newerId,
      email: 'pagination_invite_high@example.com',
    })

    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: olderInvitee.id,
      org_role: OrganizationRole.MEMBER,
      status: OrganizationUserStatus.PENDING,
      invited_by: owner.id,
    })
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: newerInvitee.id,
      org_role: OrganizationRole.MEMBER,
      status: OrganizationUserStatus.PENDING,
      invited_by: owner.id,
    })

    await db
      .from('organization_users')
      .where('organization_id', org.id)
      .whereIn('user_id', [olderInvitee.id, newerInvitee.id])
      .update({ created_at: sharedCreatedAt })

    const result = await new ListInvitationsQuery(
      {
        userId: owner.id,
        ip: '127.0.0.1',
        userAgent: 'test',
        organizationId: org.id,
      },
      organizationAdministrationRepository
    ).handle({
      page: 1,
      perPage: 2,
    })

    assert.deepEqual(
      result.invitations.map((invitation) => invitation.id),
      [newerInvitee.id, olderInvitee.id]
    )
  })

  test('invitee pending invitations page preloads organization and inviter', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const invitee = await UserFactory.create({ email: 'invitee_inbox@example.com' })

    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: invitee.id,
      org_role: OrganizationRole.MEMBER,
      status: OrganizationUserStatus.PENDING,
      invited_by: owner.id,
    })

    const result = await membershipQueries.findPendingInvitationsPageByUser(invitee.id, {
      page: 1,
      perPage: 10,
    })

    assert.lengthOf(result.data, 1)
    const invitation = result.data[0]
    if (invitation === undefined) {
      throw new Error('Expected one pending invitation')
    }
    assert.equal(invitation.organization_id, org.id)
    assert.equal(invitation.organization.name, org.name)
    assert.equal(invitation.inviter.id, owner.id)
    assert.equal(result.meta.total, 1)
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

    const command = makeInviteUserCommand({
      userId: pendingAdmin.id,
      ip: '127.0.0.1',
      userAgent: 'test',
      organizationId: org.id,
    })

    await assert.rejects(
      () => command.execute(new InviteUserDTO(org.id, inviteeEmail, OrganizationRole.MEMBER)),
      ForbiddenPolicyViolationException
    )

    assert.isNull(await membershipQueries.findMembership(org.id, invitee.id))

    const auditLogs = await getOrganizationAuditLogs('invite', org.id)
    assert.lengthOf(auditLogs, 0)
  })
})
