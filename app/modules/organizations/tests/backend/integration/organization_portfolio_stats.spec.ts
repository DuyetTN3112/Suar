import { test } from '@japa/runner'
import { DateTime } from 'luxon'

import { makeGetOrganizationDetailQuery } from '#composition/organizations/dashboard/organization_portfolio_composition'
import { GetOrganizationDetailDTO } from '#modules/organizations/actions/dtos/request/directory/get_organization_detail_dto'
import { makeSystemOrganizationActionContext } from '#modules/organizations/actions/action_context'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  cleanupTestData,
  OrganizationFactory,
  ProjectFactory,
  TaskFactory,
} from '#tests/helpers/factories'

test.group('Integration | Organization portfolio stats', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('counts only non-deleted projects and tasks within those projects', async ({
    assert,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const activeProject = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
    })
    const deletedProject = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
      deleted_at: DateTime.utc(),
    })
    await TaskFactory.create({
      project_id: activeProject.id,
      organization_id: org.id,
      creator_id: owner.id,
    })
    await TaskFactory.create({
      project_id: deletedProject.id,
      organization_id: org.id,
      creator_id: owner.id,
    })

    const result = await makeGetOrganizationDetailQuery(
      makeSystemOrganizationActionContext(owner.id)
    ).execute(new GetOrganizationDetailDTO(org.id, false, true, false))

    assert.deepEqual(result.stats, {
      member_count: 1,
      project_count: 1,
      task_count: 1,
    })
  })
})
