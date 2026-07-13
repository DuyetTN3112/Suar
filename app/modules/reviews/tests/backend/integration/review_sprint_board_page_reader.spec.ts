import { test } from '@japa/runner'

import ReviewSprintBoardPageReader from '#modules/reviews/infra/adapters/sprint-review/review_sprint_board_page_reader'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  cleanupTestData,
  OrganizationFactory,
  ProjectFactory,
} from '#tests/helpers/factories'

test.group('Integration | Review sprint board page reader', (group) => {
  group.setup(async () => {
    await setupApp()
  })

  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('loads organization administrator access from the composite membership key', async ({
    assert,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
      manager_id: owner.id,
    })

    const access = await new ReviewSprintBoardPageReader().loadProjectAccessFacts(
      project.id,
      owner.id
    )

    assert.isTrue(access.isOrganizationAdministrator)
    assert.equal(access.project?.id, project.id)
  })
})
