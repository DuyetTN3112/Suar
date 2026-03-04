import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import { OrganizationProjectListReaderAdapter } from '#composition/adapters/organization_project_list_reader_adapter'
import ListProjectsQuery from '#modules/organizations/projects/actions/query/list_projects_query'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { cleanupTestData, OrganizationFactory, ProjectFactory } from '#tests/helpers/factories'

test.group('Integration | Current projects pagination', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('orders tied created_at project rows by id desc', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const olderId = '00000000-0000-4000-8000-000000000201'
    const newerId = '00000000-0000-4000-8000-0000000002ff'
    const sharedCreatedAt = new Date('2026-07-01T12:00:00.000Z')

    await ProjectFactory.create({
      id: olderId,
      name: 'Pagination Tie Project Low',
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
    })
    await ProjectFactory.create({
      id: newerId,
      name: 'Pagination Tie Project High',
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
    })

    await db.from('projects').whereIn('id', [olderId, newerId]).update({ created_at: sharedCreatedAt })

    const result = await new ListProjectsQuery(
      {
        userId: owner.id,
        organizationId: org.id,
        ip: '127.0.0.1',
        userAgent: 'test',
      },
      new OrganizationProjectListReaderAdapter()
    ).handle({
      page: 1,
      perPage: 2,
    })

    assert.deepEqual(
      result.projects.map((project) => project.id),
      [newerId, olderId]
    )
  })
})
