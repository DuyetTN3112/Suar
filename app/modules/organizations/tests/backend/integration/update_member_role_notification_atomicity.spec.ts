import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import {
  organizationEventPublisher,
  organizationMembershipRepository,
  organizationReader,
  organizationTransactionRunner,
} from '#composition/organization_persistence_composition'
import { OrganizationRole } from '#modules/organizations/access/public_contracts/organization_constants'
import { makeSystemOrganizationActionContext } from '#modules/organizations/directory/actions/organization_action_context'
import type { OrganizationNotificationStager as NotificationStager } from '#modules/organizations/directory/actions/ports/outbound/organization_notification_stager'
import UpdateMemberRoleCommand from '#modules/organizations/members/actions/command/update_member_role_command'
import { UpdateMemberRoleDTO } from '#modules/organizations/members/actions/dtos/request/update_member_role_dto'
import * as membershipQueries from '#modules/organizations/members/infra/repositories/organization_user_repository/read/membership_queries'
import { OrganizationMembershipScenario } from '#modules/organizations/tests/backend/support/membership_scenario'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { cleanupTestData } from '#tests/helpers/factories'

class FailingNotificationStager implements NotificationStager {
  public calls = 0

  public stage(): Promise<never> {
    this.calls += 1
    return Promise.reject(new Error('role notification staging failed'))
  }
}

test.group('Integration | Update member role notification atomicity', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('required staging failure rolls back role and audit', async ({ assert }) => {
    const scenario = await OrganizationMembershipScenario.create()
    const member = await scenario.addMember({ role: OrganizationRole.MEMBER })
    const notification = new FailingNotificationStager()
    const command = new UpdateMemberRoleCommand(
      makeSystemOrganizationActionContext(scenario.owner.id),
      notification,
      organizationTransactionRunner,
      organizationReader,
      organizationMembershipRepository,
      organizationEventPublisher
    )

    await assert.rejects(
      () =>
        command.execute(
          new UpdateMemberRoleDTO(
            scenario.org.id,
            member.id,
            OrganizationRole.ADMIN
          )
        ),
      'role notification staging failed'
    )

    const membership = await membershipQueries.findMembership(scenario.org.id, member.id)
    const audit = (await db
      .from('audit_events')
      .where('entity_type', 'organization')
      .where('entity_id', scenario.org.id)
      .where('action', 'update_member_role')
      .first()) as unknown

    assert.equal(notification.calls, 1)
    assert.equal(membership?.org_role, OrganizationRole.MEMBER)
    assert.isNull(audit)
  })
})
