import { test } from '@japa/runner'

import * as membershipQueries from '#modules/organizations/members/infra/repositories/organization_user_repository/read/membership_queries'
import TaskApplication from '#modules/tasks/infra/models/task_application'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  cleanupTestData,
  OrganizationFactory,
  TaskApplicationFactory,
  TaskFactory,
  UserFactory,
} from '#tests/helpers/factories'

test.group('Integration | Process application HTTP standardization', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('approve application JSON path returns 204 and updates application status', async ({
    assert,
    client,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const applicant = await UserFactory.createExternalContributor({
      current_organization_id: org.id,
    })
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
    })
    const application = await TaskApplicationFactory.create({
      task_id: task.id,
      applicant_id: applicant.id,
      application_status: 'pending',
    })

    const response = await client
      .post(`/applications/${application.id}/process`)
      .json({
        action: 'approve',
        assignment_type: 'external_contributor',
      })
      .loginAs(owner)
      .header('accept', 'application/json')

    response.assertStatus(204)

    const updated = await TaskApplication.findOrFail(application.id)
    const membership = await membershipQueries.findMembership(org.id, applicant.id)
    assert.equal(updated.application_status, 'approved')
    assert.equal(updated.reviewed_by, owner.id)
    assert.exists(membership)
    assert.equal(membership?.status, 'approved')
    assert.equal(membership?.org_role, 'org_member')
  })
})
