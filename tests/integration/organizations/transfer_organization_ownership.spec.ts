import { test } from '@japa/runner'

import AuditLog from '#modules/audit/infra/models/audit_log'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import ForbiddenException from '#modules/http/exceptions/forbidden_exception'
import type { NotificationCreator } from '#modules/notifications/public_contracts/notification_creator'
import TransferOrganizationOwnershipCommand from '#modules/organizations/actions/commands/transfer_organization_ownership_command'
import { makeSystemOrganizationActionContext } from '#modules/organizations/actions/organization_action_context'
import { OrganizationRole } from '#modules/organizations/constants/organization_constants'
import Organization from '#modules/organizations/infra/models/organization'
import * as membershipQueries from '#modules/organizations/infra/repositories/organization_user_repository/read/membership_queries'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  cleanupTestData,
  OrganizationFactory,
  OrganizationUserFactory,
  UserFactory,
} from '#tests/helpers/factories'

type NotificationPayload = Parameters<NotificationCreator['handle']>[0]

class NotificationSpy implements NotificationCreator {
  public calls: NotificationPayload[] = []

  public handle(data: NotificationPayload): Promise<null> {
    this.calls.push(data)
    return Promise.resolve(null)
  }
}

class FailingNotification implements NotificationCreator {
  public handle(): Promise<null> {
    return Promise.reject(new Error('notification transport failed'))
  }
}

async function getRole(organizationId: string, userId: string): Promise<string | null> {
  const membershipContext = await membershipQueries.getMembershipContext(
    organizationId,
    userId
  )
  return membershipContext?.role ?? null
}

test.group('Integration | Transfer Organization Ownership', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('owner transfer persists role migration, audit trail, and notifications', async ({
    assert,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const newOwner = await UserFactory.create()

    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: newOwner.id,
      org_role: OrganizationRole.ADMIN,
      status: 'approved',
    })

    const notificationSpy = new NotificationSpy()
    const command = new TransferOrganizationOwnershipCommand(
      makeSystemOrganizationActionContext(owner.id),
      notificationSpy
    )

    const transferredOrganization = await command.execute({
      organization_id: org.id,
      new_owner_id: newOwner.id,
    })

    const persistedOrganization = await Organization.findOrFail(org.id)
    const auditLogs = await AuditLog.query()
      .where('entity_type', 'organization')
      .where('entity_id', org.id)
      .where('action', 'transfer_ownership')

    assert.equal(transferredOrganization.owner_id, newOwner.id)
    assert.equal(persistedOrganization.owner_id, newOwner.id)
    assert.equal(await getRole(org.id, owner.id), OrganizationRole.ADMIN)
    assert.equal(await getRole(org.id, newOwner.id), OrganizationRole.OWNER)
    assert.lengthOf(auditLogs, 1)
    assert.equal(auditLogs[0]?.old_values?.owner_id, owner.id)
    assert.equal(auditLogs[0]?.new_values?.owner_id, newOwner.id)
    assert.lengthOf(notificationSpy.calls, 2)
    assert.equal(notificationSpy.calls[0]?.user_id, newOwner.id)
    assert.equal(notificationSpy.calls[0]?.type, 'ownership_transferred')
    assert.equal(notificationSpy.calls[1]?.user_id, owner.id)
    assert.equal(notificationSpy.calls[1]?.type, 'ownership_transferred')
  })

  test('non-owner actors are rejected and the organization stays unchanged', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const actor = await UserFactory.create()
    const targetOwner = await UserFactory.create()

    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: actor.id,
      org_role: OrganizationRole.MEMBER,
      status: 'approved',
    })
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: targetOwner.id,
      org_role: OrganizationRole.ADMIN,
      status: 'approved',
    })

    const notificationSpy = new NotificationSpy()
    const command = new TransferOrganizationOwnershipCommand(
      makeSystemOrganizationActionContext(actor.id),
      notificationSpy
    )

    await assert.rejects(
      () =>
        command.execute({
          organization_id: org.id,
          new_owner_id: targetOwner.id,
        }),
      ForbiddenException
    )

    const persistedOrganization = await Organization.findOrFail(org.id)
    const auditLogs = await AuditLog.query()
      .where('entity_type', 'organization')
      .where('entity_id', org.id)
      .where('action', 'transfer_ownership')

    assert.equal(persistedOrganization.owner_id, owner.id)
    assert.equal(await getRole(org.id, owner.id), OrganizationRole.OWNER)
    assert.equal(await getRole(org.id, targetOwner.id), OrganizationRole.ADMIN)
    assert.lengthOf(notificationSpy.calls, 0)
    assert.lengthOf(auditLogs, 0)
  })

  test('new owners must be approved admin-or-owner members and rejected transfers leave no partial writes', async ({
    assert,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const targetOwner = await UserFactory.create()

    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: targetOwner.id,
      org_role: OrganizationRole.MEMBER,
      status: 'approved',
    })

    const notificationSpy = new NotificationSpy()
    const command = new TransferOrganizationOwnershipCommand(
      makeSystemOrganizationActionContext(owner.id),
      notificationSpy
    )

    await assert.rejects(
      () =>
        command.execute({
          organization_id: org.id,
          new_owner_id: targetOwner.id,
        }),
      BusinessLogicException
    )

    const persistedOrganization = await Organization.findOrFail(org.id)
    const auditLogs = await AuditLog.query()
      .where('entity_type', 'organization')
      .where('entity_id', org.id)
      .where('action', 'transfer_ownership')

    assert.equal(persistedOrganization.owner_id, owner.id)
    assert.equal(await getRole(org.id, owner.id), OrganizationRole.OWNER)
    assert.equal(await getRole(org.id, targetOwner.id), OrganizationRole.MEMBER)
    assert.lengthOf(notificationSpy.calls, 0)
    assert.lengthOf(auditLogs, 0)
  })

  test('notification failures do not roll back a committed ownership transfer', async ({
    assert,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const newOwner = await UserFactory.create()

    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: newOwner.id,
      org_role: OrganizationRole.ADMIN,
      status: 'approved',
    })

    const command = new TransferOrganizationOwnershipCommand(
      makeSystemOrganizationActionContext(owner.id),
      new FailingNotification()
    )

    await command.execute({
      organization_id: org.id,
      new_owner_id: newOwner.id,
    })

    const persistedOrganization = await Organization.findOrFail(org.id)
    const auditLogs = await AuditLog.query()
      .where('entity_type', 'organization')
      .where('entity_id', org.id)
      .where('action', 'transfer_ownership')

    assert.equal(persistedOrganization.owner_id, newOwner.id)
    assert.equal(await getRole(org.id, owner.id), OrganizationRole.ADMIN)
    assert.equal(await getRole(org.id, newOwner.id), OrganizationRole.OWNER)
    assert.lengthOf(auditLogs, 1)
  })
})
