import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import { makeRemoveMemberCommand } from '#composition/organizations/members/organization_notification_composition'
import { makeSystemOrganizationActionContext } from '#modules/organizations/actions/action_context'
import type { OrganizationNotificationStager as NotificationStager } from '#modules/organizations/actions/ports/outbound/directory/organization_notification_stager'
import { RemoveMemberDTO } from '#modules/organizations/actions/dtos/request/members/remove_member_dto'
import { OrganizationMembershipScenario } from '#modules/organizations/tests/backend/support/members/membership_scenario'
import Task from '#modules/tasks/infra/models/task-authoring/task'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { cleanupTestData, ProjectMemberFactory } from '#tests/helpers/factories'

class FailingNotificationStager implements NotificationStager {
  public calls = 0

  public stage(): Promise<never> {
    this.calls += 1
    return Promise.reject(new Error('removal notification staging failed'))
  }
}

test.group('Integration | Remove member notification atomicity', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('required staging failure restores membership, task assignment, and audit', async ({
    assert,
  }) => {
    const scenario = await OrganizationMembershipScenario.create()
    const member = await scenario.addMember()
    const project = await scenario.createOwnedProject()
    await ProjectMemberFactory.create({
      project_id: project.id,
      user_id: member.id,
    })
    const task = await scenario.createAssignedTask(project, member.id)
    const notification = new FailingNotificationStager()
    const command = makeRemoveMemberCommand(
      makeSystemOrganizationActionContext(scenario.owner.id),
      notification
    )

    await assert.rejects(
      () =>
        command.execute(
          new RemoveMemberDTO(scenario.org.id, member.id, 'Atomic removal')
        ),
      'removal notification staging failed'
    )

    const membership = (await db
      .from('organization_users')
      .where('organization_id', scenario.org.id)
      .where('user_id', member.id)
      .first()) as unknown
    const audit = (await db
      .from('audit_events')
      .where('entity_type', 'organization')
      .where('entity_id', scenario.org.id)
      .where('action', 'remove_member')
      .first()) as unknown
    const persistedTask = await Task.findOrFail(task.id)
    const projectMembership = (await db
      .from('project_members')
      .where('project_id', project.id)
      .where('user_id', member.id)
      .first()) as unknown

    assert.equal(notification.calls, 1)
    assert.isNotNull(membership)
    assert.isNotNull(projectMembership)
    assert.equal(persistedTask.assigned_to, member.id)
    assert.isNull(audit)
  })
})
