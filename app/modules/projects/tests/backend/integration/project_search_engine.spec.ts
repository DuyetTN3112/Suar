import { test } from '@japa/runner'

import { makeSystemProjectActionContext } from '#modules/projects/actions/project_action_context'
import GetProjectsListQuery from '#modules/projects/actions/queries/get_projects_list_query'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  cleanupTestData,
  ProjectFactory,
  UserFactory,
} from '#tests/helpers/factories'

test.group('Integration | Project Search Engine', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('retrieves accessible projects by indexed keyword', async ({ assert }) => {
    const owner = await UserFactory.create()
    const matchingProject = await ProjectFactory.create({
      creator_id: owner.id,
      owner_id: owner.id,
      manager_id: owner.id,
      name: 'Search Platform',
      visibility: 'team',
    })
    await ProjectFactory.create({
      creator_id: owner.id,
      owner_id: owner.id,
      manager_id: owner.id,
      name: 'Billing Rewrite',
      visibility: 'team',
    })

    const [{ ProjectSearchDocumentBuilder }, { ProjectSearchIndexRepository }, { searchClient }] =
      await Promise.all([
        import('#modules/search/infra/projects/project_search_document_builder'),
        import('#modules/search/infra/projects/project_search_index_repository'),
        import('#modules/search/infra/search_client'),
      ])

    const repository = new ProjectSearchIndexRepository()
    const builder = new ProjectSearchDocumentBuilder()

    await repository.resetIndex()
    await repository.ensureIndex()
    await repository.upsertDocument(await builder.build(matchingProject.id))
    await searchClient.indices.refresh({ index: repository.indexName })

    const query = new GetProjectsListQuery(makeSystemProjectActionContext(owner.id))
    const result = await query.handle({
      search: 'Search',
    })

    assert.include(
      result.data.map((project) => (project as { id: string }).id),
      matchingProject.id
    )
  }).timeout(10000)
})
