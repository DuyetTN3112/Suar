import { test } from '@japa/runner'

import TaskApplication from '#modules/tasks/infra/models/task-applications/task_application'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  cleanupTestData,
  OrganizationFactory,
  OrganizationUserFactory,
  TaskApplicationFactory,
  TaskFactory,
  UserFactory,
} from '#tests/helpers/factories'

test.group('Integration | Withdraw application HTTP standardization', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('withdraw application JSON path returns 204 and updates application status', async ({
    assert,
    client,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const applicant = await UserFactory.create({
      current_organization_id: org.id,
    })
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: applicant.id,
      org_role: 'org_member',
      status: 'approved',
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
      .post(`/applications/${application.id}/withdraw`)
      .loginAs(applicant)
      .header('accept', 'application/json')

    response.assertStatus(204)

    const updated = await TaskApplication.findOrFail(application.id)
    assert.equal(updated.application_status, 'withdrawn')
  })
})
