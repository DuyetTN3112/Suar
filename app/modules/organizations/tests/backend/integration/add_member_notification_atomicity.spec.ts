import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import { notificationApplication as notificationPublicApi } from '#composition/notification_composition'
import {
  organizationEventPublisher,
  organizationMembershipRepository,
  organizationTransactionRunner,
} from '#composition/organization_persistence_composition'
import { organizationUserReaderWriter } from '#composition/organization_user_composition'
import { buildNotificationEventId } from '#modules/notifications/public_contracts/notification_event_identity'
import { OrganizationRole } from '#modules/organizations/access/public_contracts/organization_constants'
import { makeSystemOrganizationActionContext } from '#modules/organizations/directory/actions/organization_action_context'
import type { OrganizationNotificationStager as NotificationStager } from '#modules/organizations/directory/actions/ports/outbound/organization_notification_stager'
import AddMemberCommand from '#modules/organizations/members/actions/command/add_member_command'
import { AddMemberDTO } from '#modules/organizations/members/actions/dtos/request/add_member_dto'
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
    return Promise.reject(new Error('member notification staging failed'))
  }
}

test.group('Integration | Add member notification atomicity', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('required staging failure rolls back membership and audit', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const member = await UserFactory.create()
    const notification = new FailingNotificationStager()
    const command = new AddMemberCommand(
      makeSystemOrganizationActionContext(owner.id),
      notification,
      organizationUserReaderWriter,
      organizationTransactionRunner,
      organizationMembershipRepository,
      organizationEventPublisher
    )

    await assert.rejects(
      () =>
        command.execute(
          new AddMemberDTO(org.id, member.id, OrganizationRole.MEMBER)
        ),
      'member notification staging failed'
    )

    const membership = (await db
      .from('organization_users')
      .where('organization_id', org.id)
      .where('user_id', member.id)
      .first()) as unknown
    const audit = (await db
      .from('audit_events')
      .where('entity_type', 'organization')
      .where('entity_id', org.id)
      .where('action', 'add_member')
      .first()) as unknown

    assert.equal(notification.calls, 1)
    assert.isNull(membership)
    assert.isNull(audit)
  })

  test('membership and canonical projection intents commit together', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const member = await UserFactory.create()
    const command = new AddMemberCommand(
      makeSystemOrganizationActionContext(owner.id),
      notificationPublicApi,
      organizationUserReaderWriter,
      organizationTransactionRunner,
      organizationMembershipRepository,
      organizationEventPublisher
    )

    await command.execute(new AddMemberDTO(org.id, member.id, OrganizationRole.MEMBER))

    const membership = (await db
      .from('organization_users')
      .select('created_at')
      .where('organization_id', org.id)
      .where('user_id', member.id)
      .first()) as { created_at: Date | string } | null
    const notification = (await db
      .from('notifications')
      .select('event_id', 'revision', 'category', 'action')
      .where('user_id', member.id)
      .where('type', 'member_added')
      .where('related_entity_id', org.id)
      .first()) as
      | {
          event_id: string
          revision: number | string
          category: string
          action: { routeName?: string } | null
        }
      | null

    assert.isNotNull(membership)
    assert.isNotNull(notification)
    if (!membership || !notification) return

    const occurredAt = new Date(membership.created_at).toISOString()
    assert.equal(
      notification.event_id,
      buildNotificationEventId({
        eventName: 'organization.member_added',
        businessEventId: `${org.id}:${member.id}:${occurredAt}`,
        recipientId: member.id,
      })
    )
    assert.equal(Number(notification.revision), 1)
    assert.equal(notification.category, 'organization')
    assert.equal(notification.action?.routeName, 'organizations.show')

    const outbox = await db
      .from('notification_outbox')
      .where('source_event_id', notification.event_id)
    assert.lengthOf(outbox, 2)
  })
})
