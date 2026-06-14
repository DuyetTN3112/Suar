import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import { organizationCacheInvalidator } from '#composition/organizations/access/organization_cache_composition'
import {
  organizationEventPublisher,
  organizationMembershipRepository,
  organizationTransactionRunner,
} from '#composition/organizations/persistence/organization_persistence_composition'
import { makeSystemOrganizationActionContext } from '#modules/organizations/actions/action_context'
import type { OrganizationNotificationStager as NotificationStager } from '#modules/organizations/actions/ports/outbound/directory/organization_notification_stager'
import ProcessJoinRequestCommand from '#modules/organizations/actions/commands/invitations/process_join_request_command'
import { ProcessJoinRequestDTO } from '#modules/organizations/actions/dtos/request/invitations/process_join_request_dto'
import * as membershipQueries from '#modules/organizations/infra/repositories/members/organization_user_repository/read/membership_queries'
import { OrganizationMembershipScenario } from '#modules/organizations/tests/backend/support/members/membership_scenario'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { cleanupTestData } from '#tests/helpers/factories'

class FailingNotificationStager implements NotificationStager {
  public calls = 0

  public stage(): Promise<never> {
    this.calls += 1
    return Promise.reject(new Error('join decision notification staging failed'))
  }
}

test.group('Integration | Process join request notification atomicity', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('required staging failure restores pending decision and audit', async ({ assert }) => {
    const scenario = await OrganizationMembershipScenario.create()
    const requester = await scenario.addMember({ status: 'pending' })
    const notification = new FailingNotificationStager()
    const command = new ProcessJoinRequestCommand(
      makeSystemOrganizationActionContext(scenario.owner.id),
      notification,
      organizationTransactionRunner,
      organizationMembershipRepository,
      organizationEventPublisher,
      organizationCacheInvalidator
    )

    await assert.rejects(
      () =>
        command.execute(new ProcessJoinRequestDTO(scenario.org.id, requester.id, true, 'Approved')),
      'join decision notification staging failed'
    )

    const membership = await membershipQueries.findMembership(scenario.org.id, requester.id)
    const audit = (await db
      .from('audit_events')
      .where('entity_type', 'organization')
      .where('entity_id', scenario.org.id)
      .where('action', 'approved_join_request')
      .first()) as unknown

    assert.equal(notification.calls, 1)
    assert.equal(membership?.status, 'pending')
    assert.isNull(audit)
  })
})
