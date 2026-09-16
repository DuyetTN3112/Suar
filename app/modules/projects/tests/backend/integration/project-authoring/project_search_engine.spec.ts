import { test } from '@japa/runner'

import { projectsSearchComposition } from '#composition/projects/project-search/projects_search_composition'
import { makeSystemProjectActionContext } from '#modules/projects/actions/project_action_context'
import { LucidProjectSearchDocumentReader } from '#modules/projects/infra/adapters/project-context/lucid_project_search_document_reader'
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
        import('#modules/search/infra/adapters/entity-search/projects/project_search_document_builder'),
        import('#modules/search/infra/repositories/entity-search/projects/project_search_index_repository'),
        import('#platform/search/elasticsearch_client'),
      ])

    const repository = new ProjectSearchIndexRepository()
    const builder = new ProjectSearchDocumentBuilder(new LucidProjectSearchDocumentReader())

    await repository.resetIndex()
    await repository.ensureIndex()
    const searchDocument = await builder.build(matchingProject.id)
    if (!searchDocument) {
      throw new Error('Expected the persisted project to produce a search document')
    }
    await repository.upsertDocument(searchDocument)
    await searchClient.indices.refresh({ index: repository.indexName })

    const result = await projectsSearchComposition.listProjects(
      { search: 'Search' },
      makeSystemProjectActionContext(owner.id)
    )

    assert.include(
      result.data.map((project) => (project as { id: string }).id),
      matchingProject.id
    )
  }).timeout(10000)
})
