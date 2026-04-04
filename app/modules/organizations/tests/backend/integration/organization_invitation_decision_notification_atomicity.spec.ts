import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import { notificationApplication as notificationPublicApi } from '#composition/notification_composition'
import { organizationCacheInvalidator } from '#composition/organization_cache_composition'
import {
  organizationEventPublisher,
  organizationMembershipRepository,
  organizationReader,
  organizationTransactionRunner,
} from '#composition/organization_persistence_composition'
import { buildNotificationEventId } from '#modules/notifications/public_contracts/notification_event_identity'
import { OrganizationRole } from '#modules/organizations/access/public_contracts/organization_constants'
import { makeSystemOrganizationActionContext } from '#modules/organizations/directory/actions/organization_action_context'
import type { OrganizationNotificationStager as NotificationStager } from '#modules/organizations/directory/actions/ports/outbound/organization_notification_stager'
import AcceptOrganizationInvitationCommand from '#modules/organizations/invitations/actions/command/accept_organization_invitation_command'
import RejectOrganizationInvitationCommand from '#modules/organizations/invitations/actions/command/reject_organization_invitation_command'
import * as membershipQueries from '#modules/organizations/members/infra/repositories/organization_user_repository/read/membership_queries'
import { OrganizationMembershipScenario } from '#modules/organizations/tests/backend/support/membership_scenario'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { cleanupTestData } from '#tests/helpers/factories'

class FailingNotificationStager implements NotificationStager {
  public calls = 0

  public stage(): Promise<never> {
    this.calls += 1
    return Promise.reject(new Error('invitation decision notification staging failed'))
  }
}

const makeAcceptCommand = (
  context: ConstructorParameters<typeof AcceptOrganizationInvitationCommand>[0],
  notification: ConstructorParameters<typeof AcceptOrganizationInvitationCommand>[1]
) =>
  new AcceptOrganizationInvitationCommand(
    context,
    notification,
    organizationTransactionRunner,
    organizationReader,
    organizationMembershipRepository,
    organizationEventPublisher
  )

const makeRejectCommand = (
  context: ConstructorParameters<typeof RejectOrganizationInvitationCommand>[0],
  notification: ConstructorParameters<typeof RejectOrganizationInvitationCommand>[1]
) =>
  new RejectOrganizationInvitationCommand(
    context,
    notification,
    organizationTransactionRunner,
    organizationReader,
    organizationMembershipRepository,
    organizationCacheInvalidator
  )

async function findDecisionAudit(
  organizationId: string,
  action: 'accept_invitation' | 'reject_invitation'
): Promise<unknown> {
  return db
    .from('audit_events')
    .where('entity_type', 'organization')
    .where('entity_id', organizationId)
    .where('action', action)
    .first()
}

test.group('Integration | Organization invitation decision notification atomicity', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('accept staging failure rolls membership and audit back', async ({ assert }) => {
    const scenario = await OrganizationMembershipScenario.create()
    const invitee = await scenario.addMember({
      role: OrganizationRole.MEMBER,
      status: 'pending',
      invitedById: scenario.owner.id,
    })
    const notification = new FailingNotificationStager()
    const command = makeAcceptCommand(makeSystemOrganizationActionContext(invitee.id), notification)

    await assert.rejects(
      () => command.execute(scenario.org.id),
      'invitation decision notification staging failed'
    )

    const membership = await membershipQueries.findMembership(scenario.org.id, invitee.id)
    assert.equal(notification.calls, 1)
    assert.equal(membership?.status, 'pending')
    assert.isNull(await findDecisionAudit(scenario.org.id, 'accept_invitation'))
  })

  test('reject staging failure rolls membership and audit back', async ({ assert }) => {
    const scenario = await OrganizationMembershipScenario.create()
    const invitee = await scenario.addMember({
      role: OrganizationRole.MEMBER,
      status: 'pending',
      invitedById: scenario.owner.id,
    })
    const notification = new FailingNotificationStager()
    const command = makeRejectCommand(makeSystemOrganizationActionContext(invitee.id), notification)

    await assert.rejects(
      () => command.execute(scenario.org.id),
      'invitation decision notification staging failed'
    )

    const membership = await membershipQueries.findMembership(scenario.org.id, invitee.id)
    assert.equal(notification.calls, 1)
    assert.equal(membership?.status, 'pending')
    assert.isNull(await findDecisionAudit(scenario.org.id, 'reject_invitation'))
  })

  test('accept decision and canonical projection intents commit together', async ({ assert }) => {
    const scenario = await OrganizationMembershipScenario.create()
    const invitee = await scenario.addMember({
      role: OrganizationRole.MEMBER,
      status: 'pending',
      invitedById: scenario.owner.id,
    })
    const pendingMembership = await membershipQueries.findMembership(scenario.org.id, invitee.id)
    const command = makeAcceptCommand(
      makeSystemOrganizationActionContext(invitee.id),
      notificationPublicApi
    )

    await command.execute(scenario.org.id)

    const membership = await membershipQueries.findMembership(scenario.org.id, invitee.id)
    const notification = (await db
      .from('notifications')
      .select('event_id', 'category', 'title', 'message', 'action')
      .where('user_id', scenario.owner.id)
      .where('type', 'organization_join_approved')
      .where('related_entity_id', scenario.org.id)
      .first()) as {
      event_id: string
      category: string
      title: string
      message: string
      action: { routeName?: string } | null
    } | null

    assert.equal(membership?.status, 'approved')
    assert.isNotNull(pendingMembership)
    assert.isNotNull(notification)
    if (!pendingMembership || !notification) return

    const occurredAt = pendingMembership.created_at.toUTC().toISO()
    assert.isNotNull(occurredAt)
    if (!occurredAt) return
    assert.equal(
      notification.event_id,
      buildNotificationEventId({
        eventName: 'organization.invitation_accepted',
        businessEventId: `${scenario.org.id}:${invitee.id}:${occurredAt}`,
        recipientId: scenario.owner.id,
      })
    )
    assert.equal(notification.category, 'organization')
    assert.equal(notification.title, 'Lời mời được chấp nhận')
    assert.include(notification.message, scenario.org.name)
    assert.equal(notification.action?.routeName, 'organizations.show')
    assert.lengthOf(
      await db.from('notification_outbox').where('source_event_id', notification.event_id),
      2
    )
  })

  test('reject decision and canonical projection intents commit together', async ({ assert }) => {
    const scenario = await OrganizationMembershipScenario.create()
    const invitee = await scenario.addMember({
      role: OrganizationRole.MEMBER,
      status: 'pending',
      invitedById: scenario.owner.id,
    })
    const pendingMembership = await membershipQueries.findMembership(scenario.org.id, invitee.id)
    const command = makeRejectCommand(
      makeSystemOrganizationActionContext(invitee.id),
      notificationPublicApi
    )

    await command.execute(scenario.org.id)

    const membership = await membershipQueries.findMembership(scenario.org.id, invitee.id)
    const notification = (await db
      .from('notifications')
      .select('event_id', 'category', 'title', 'message', 'action')
      .where('user_id', scenario.owner.id)
      .where('type', 'organization_join_rejected')
      .where('related_entity_id', scenario.org.id)
      .first()) as {
      event_id: string
      category: string
      title: string
      message: string
      action: { routeName?: string } | null
    } | null

    assert.equal(membership?.status, 'rejected')
    assert.isNotNull(pendingMembership)
    assert.isNotNull(notification)
    if (!pendingMembership || !notification) return

    const occurredAt = pendingMembership.created_at.toUTC().toISO()
    assert.isNotNull(occurredAt)
    if (!occurredAt) return
    assert.equal(
      notification.event_id,
      buildNotificationEventId({
        eventName: 'organization.invitation_rejected',
        businessEventId: `${scenario.org.id}:${invitee.id}:${occurredAt}`,
        recipientId: scenario.owner.id,
      })
    )
    assert.equal(notification.category, 'organization')
    assert.equal(notification.title, 'Lời mời bị từ chối')
    assert.include(notification.message, scenario.org.name)
    assert.equal(notification.action?.routeName, 'organizations.show')
    assert.lengthOf(
      await db.from('notification_outbox').where('source_event_id', notification.event_id),
      2
    )
  })
})
