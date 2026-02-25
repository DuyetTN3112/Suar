import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import { notificationApplication as notificationPublicApi } from '#composition/notification_composition'
import {
  organizationMembershipRepository,
  organizationReader,
  organizationTransactionRunner,
} from '#composition/organization_persistence_composition'
import { organizationUserReaderWriter } from '#composition/organization_user_composition'
import { buildNotificationEventId } from '#modules/notifications/public_contracts/notification_event_identity'
import { OrganizationRole } from '#modules/organizations/access/public_contracts/organization_constants'
import { makeSystemOrganizationActionContext } from '#modules/organizations/directory/actions/organization_action_context'
import type { OrganizationNotificationStager as NotificationStager } from '#modules/organizations/directory/actions/ports/outbound/organization_notification_stager'
import InviteUserCommand from '#modules/organizations/invitations/actions/command/invite_user_command'
import { InviteUserDTO } from '#modules/organizations/invitations/actions/dtos/request/invite_user_dto'
import * as membershipQueries from '#modules/organizations/members/infra/repositories/organization_user_repository/read/membership_queries'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  cleanupTestData,
  OrganizationFactory,
  UserFactory,
} from '#tests/helpers/factories'

class FailingNotificationStager implements NotificationStager {
  public calls = 0

  public stage(): Promise<never> {
    this.calls += 1
    return Promise.reject(new Error('invitation notification staging failed'))
  }
}

test.group('Integration | Invite user notification atomicity', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('required staging failure rolls back invitation membership and audit', async ({
    assert,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const invitee = await UserFactory.create()
    const notification = new FailingNotificationStager()
    const command = new InviteUserCommand(
      makeSystemOrganizationActionContext(owner.id),
      notification,
      organizationUserReaderWriter,
      organizationTransactionRunner,
      organizationReader,
      organizationMembershipRepository
    )

    await assert.rejects(
      () =>
        command.execute(
          new InviteUserDTO(
            org.id,
            invitee.email ?? '',
            OrganizationRole.MEMBER
          )
        ),
      'invitation notification staging failed'
    )

    const membership = await membershipQueries.findMembership(org.id, invitee.id)
    const audit = (await db
      .from('audit_events')
      .where('entity_type', 'organization')
      .where('entity_id', org.id)
      .where('action', 'invite')
      .first()) as unknown

    assert.equal(notification.calls, 1)
    assert.isNull(membership)
    assert.isNull(audit)
  })

  test('invitation and canonical projection intents commit together', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const invitee = await UserFactory.create()
    const command = new InviteUserCommand(
      makeSystemOrganizationActionContext(owner.id),
      notificationPublicApi,
      organizationUserReaderWriter,
      organizationTransactionRunner,
      organizationReader,
      organizationMembershipRepository
    )

    await command.execute(
      new InviteUserDTO(org.id, invitee.email ?? '', OrganizationRole.MEMBER)
    )

    const membership = (await db
      .from('organization_users')
      .select('created_at')
      .where('organization_id', org.id)
      .where('user_id', invitee.id)
      .first()) as { created_at: Date | string } | null
    const notification = (await db
      .from('notifications')
      .select('event_id', 'revision', 'category', 'action', 'title', 'message')
      .where('user_id', invitee.id)
      .where('type', 'organization_invitation')
      .where('related_entity_id', org.id)
      .first()) as
      | {
          event_id: string
          revision: number | string
          category: string
          action: { routeName?: string } | null
          title: string
          message: string
        }
      | null

    assert.isNotNull(membership)
    assert.isNotNull(notification)
    if (!membership || !notification) return

    const occurredAt = new Date(membership.created_at).toISOString()
    assert.equal(
      notification.event_id,
      buildNotificationEventId({
        eventName: 'organization.invited',
        businessEventId: `${org.id}:${invitee.id}:${occurredAt}`,
        recipientId: invitee.id,
      })
    )
    assert.equal(Number(notification.revision), 1)
    assert.equal(notification.category, 'organization')
    assert.equal(notification.action?.routeName, 'organizations.show')
    assert.equal(notification.title, 'Lời mời tham gia tổ chức')
    assert.include(notification.message, org.name)

    const outbox = await db
      .from('notification_outbox')
      .where('source_event_id', notification.event_id)
    assert.lengthOf(outbox, 2)
  })
})
