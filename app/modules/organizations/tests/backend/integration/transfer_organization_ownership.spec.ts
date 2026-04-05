import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import { notificationApplication as notificationPublicApi } from '#composition/notification_composition'
import {
  organizationEventPublisher,
  organizationMembershipRepository,
  organizationTransactionRunner,
  organizationWriter,
} from '#composition/organization_persistence_composition'
import { organizationUserReaderWriter } from '#composition/organization_user_composition'
import AuditLog from '#modules/audit/infra/models/audit_log'
import {
  BusinessPolicyViolationException,
  ForbiddenPolicyViolationException,
} from '#modules/authorization/public_contracts/policy_violation'
import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import { buildNotificationEventId } from '#modules/notifications/public_contracts/notification_event_identity'
import { OrganizationRole } from '#modules/organizations/access/public_contracts/organization_constants'
import { makeSystemOrganizationActionContext } from '#modules/organizations/directory/actions/organization_action_context'
import type { OrganizationNotificationStager as NotificationStager } from '#modules/organizations/directory/actions/ports/outbound/organization_notification_stager'
import Organization from '#modules/organizations/directory/infra/models/organization'
import TransferOrganizationOwnershipCommand from '#modules/organizations/members/actions/command/transfer_organization_ownership_command'
import * as membershipQueries from '#modules/organizations/members/infra/repositories/organization_user_repository/read/membership_queries'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  cleanupTestData,
  OrganizationFactory,
  OrganizationUserFactory,
  UserFactory,
} from '#tests/helpers/factories'

type NotificationPayload = Parameters<NotificationStager['stage']>[0]

class NotificationSpy implements NotificationStager {
  public calls: NotificationPayload[] = []

  public stage(data: NotificationPayload): Promise<null> {
    this.calls.push(data)
    return Promise.resolve(null)
  }
}

class FailingNotificationStager implements NotificationStager {
  public calls = 0

  public stage(): Promise<never> {
    this.calls += 1
    return Promise.reject(new Error('ownership notification staging failed'))
  }
}

const makeTransferCommand = (
  context: ConstructorParameters<typeof TransferOrganizationOwnershipCommand>[0],
  notification: ConstructorParameters<typeof TransferOrganizationOwnershipCommand>[1]
) =>
  new TransferOrganizationOwnershipCommand(
    context,
    notification,
    organizationUserReaderWriter,
    organizationTransactionRunner,
    organizationWriter,
    organizationMembershipRepository,
    organizationEventPublisher
  )

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

    const command = makeTransferCommand(
      makeSystemOrganizationActionContext(owner.id),
      notificationPublicApi
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
    assert.equal(auditLogs[0]?.old_values?.['owner_id'], owner.id)
    assert.equal(auditLogs[0]?.new_values?.['owner_id'], newOwner.id)

    const notifications = (await db
      .from('notifications')
      .select('event_id', 'user_id', 'title', 'message', 'action')
      .where('type', 'ownership_transferred')
      .where('related_entity_id', org.id)
      .orderBy('user_id', 'asc')) as {
      event_id: string
      user_id: string
      title: string
      message: string
      action: { routeName?: string } | null
    }[]
    assert.lengthOf(notifications, 2)

    const occurredAt = transferredOrganization.updated_at
    assert.isNotNull(occurredAt)
    if (!occurredAt) return
    for (const recipientId of [newOwner.id, owner.id]) {
      const notification = notifications.find((candidate) => candidate.user_id === recipientId)
      assert.isDefined(notification)
      if (!notification) continue
      assert.equal(
        notification.event_id,
        buildNotificationEventId({
          eventName: 'organization.ownership_transferred',
          businessEventId: `${org.id}:${owner.id}:${newOwner.id}:${occurredAt}`,
          recipientId,
        })
      )
      assert.include(notification.message, org.name)
      assert.equal(notification.action?.routeName, 'organizations.show')
    }
    assert.equal(
      notifications.find((candidate) => candidate.user_id === newOwner.id)?.title,
      'Bạn đã trở thành owner'
    )
    assert.equal(
      notifications.find((candidate) => candidate.user_id === owner.id)?.title,
      'Đã chuyển giao quyền sở hữu'
    )
    assert.lengthOf(
      await db
        .from('notification_outbox')
        .whereIn(
          'source_event_id',
          notifications.map((notification) => notification.event_id)
        ),
      4
    )
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
    const command = makeTransferCommand(
      makeSystemOrganizationActionContext(actor.id),
      notificationSpy
    )

    await assert.rejects(
      () =>
        command.execute({
          organization_id: org.id,
          new_owner_id: targetOwner.id,
        }),
      ForbiddenPolicyViolationException
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
    const command = makeTransferCommand(
      makeSystemOrganizationActionContext(owner.id),
      notificationSpy
    )

    await assert.rejects(
      () =>
        command.execute({
          organization_id: org.id,
          new_owner_id: targetOwner.id,
        }),
      BusinessPolicyViolationException
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

  test('inactive approved targets are rejected and ownership stays unchanged', async ({
    assert,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const inactiveTarget = await UserFactory.create({ status: 'inactive' })

    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: inactiveTarget.id,
      org_role: OrganizationRole.ADMIN,
      status: 'approved',
    })

    const notificationSpy = new NotificationSpy()
    const command = makeTransferCommand(
      makeSystemOrganizationActionContext(owner.id),
      notificationSpy
    )

    await assert.rejects(
      () =>
        command.execute({
          organization_id: org.id,
          new_owner_id: inactiveTarget.id,
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
    assert.equal(await getRole(org.id, inactiveTarget.id), OrganizationRole.ADMIN)
    assert.lengthOf(notificationSpy.calls, 0)
    assert.lengthOf(auditLogs, 0)
  })

  test('foreign organization targets are rejected and both organizations stay unchanged', async ({
    assert,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const { org: foreignOrg, owner: foreignOwner } = await OrganizationFactory.createWithOwner()
    const foreignTarget = await UserFactory.create()

    await OrganizationUserFactory.create({
      organization_id: foreignOrg.id,
      user_id: foreignTarget.id,
      org_role: OrganizationRole.ADMIN,
      status: 'approved',
    })

    const notificationSpy = new NotificationSpy()
    const command = makeTransferCommand(
      makeSystemOrganizationActionContext(owner.id),
      notificationSpy
    )

    await assert.rejects(
      () =>
        command.execute({
          organization_id: org.id,
          new_owner_id: foreignTarget.id,
        }),
      BusinessPolicyViolationException
    )

    const persistedOrganization = await Organization.findOrFail(org.id)
    const persistedForeignOrganization = await Organization.findOrFail(foreignOrg.id)
    const auditLogs = await AuditLog.query()
      .where('entity_type', 'organization')
      .where('action', 'transfer_ownership')
    const relevantAuditLogs = auditLogs.filter((log) =>
      typeof log.entity_id === 'string' && [org.id, foreignOrg.id].includes(log.entity_id)
    )

    assert.equal(persistedOrganization.owner_id, owner.id)
    assert.equal(persistedForeignOrganization.owner_id, foreignOwner.id)
    assert.equal(await getRole(org.id, owner.id), OrganizationRole.OWNER)
    assert.isNull(await getRole(org.id, foreignTarget.id))
    assert.equal(await getRole(foreignOrg.id, foreignTarget.id), OrganizationRole.ADMIN)
    assert.lengthOf(notificationSpy.calls, 0)
    assert.lengthOf(relevantAuditLogs, 0)
  })

  test('required notification staging failure rolls back the complete ownership transfer', async ({
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

    const notification = new FailingNotificationStager()
    const command = makeTransferCommand(
      makeSystemOrganizationActionContext(owner.id),
      notification
    )

    await assert.rejects(
      () =>
        command.execute({
          organization_id: org.id,
          new_owner_id: newOwner.id,
        }),
      'ownership notification staging failed'
    )

    const persistedOrganization = await Organization.findOrFail(org.id)
    const auditLogs = await AuditLog.query()
      .where('entity_type', 'organization')
      .where('entity_id', org.id)
      .where('action', 'transfer_ownership')

    assert.equal(notification.calls, 1)
    assert.equal(persistedOrganization.owner_id, owner.id)
    assert.equal(await getRole(org.id, owner.id), OrganizationRole.OWNER)
    assert.equal(await getRole(org.id, newOwner.id), OrganizationRole.ADMIN)
    assert.lengthOf(auditLogs, 0)
  })
})
