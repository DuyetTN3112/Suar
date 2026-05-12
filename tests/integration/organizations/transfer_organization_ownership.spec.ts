import { test } from '@japa/runner'

import type { NotificationCreator } from '#actions/notifications/public_api'
import TransferOrganizationOwnershipCommand from '#actions/organizations/commands/transfer_organization_ownership_command'
import { OrganizationRole } from '#constants/organization_constants'
import BusinessLogicException from '#exceptions/business_logic_exception'
import ForbiddenException from '#exceptions/forbidden_exception'
import AuditLog from '#infra/audit/models/audit_log'
import Organization from '#infra/organizations/models/organization'
import OrganizationUserRepository from '#infra/organizations/repositories/organization_user_repository'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  cleanupTestData,
  OrganizationFactory,
  OrganizationUserFactory,
  UserFactory,
} from '#tests/helpers/factories'
import { ExecutionContext } from '#types/execution_context'

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
  const membershipContext = await OrganizationUserRepository.getMembershipContext(
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
      ExecutionContext.system(owner.id),
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
      ExecutionContext.system(actor.id),
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
      ExecutionContext.system(owner.id),
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
      ExecutionContext.system(owner.id),
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
