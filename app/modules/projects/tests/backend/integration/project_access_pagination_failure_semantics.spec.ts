import { test } from '@japa/runner'

import { paginateByUserAccess } from '#modules/projects/infra/repositories/read/access_queries'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { cleanupTestData, ProjectFactory, UserFactory } from '#tests/helpers/factories'

test.group('Integration | Project access pagination failure semantics', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('counts all distinct accessible projects before applying the data grouping', async ({
    assert,
  }) => {
    const owner = await UserFactory.create({ username: 'project_access_pagination_owner' })
    const first = await ProjectFactory.create({
      creator_id: owner.id,
      owner_id: owner.id,
      manager_id: owner.id,
      name: 'Pagination project one',
    })
    const second = await ProjectFactory.create({
      creator_id: owner.id,
      owner_id: owner.id,
      manager_id: owner.id,
      name: 'Pagination project two',
    })

    const result = await paginateByUserAccess(owner.id, {
      page: 1,
      limit: 10,
    })

    assert.equal(result.total, 2)
    assert.sameMembers(
      result.data.map((project) => project['id']),
      [first.id, second.id]
    )
  })
})
