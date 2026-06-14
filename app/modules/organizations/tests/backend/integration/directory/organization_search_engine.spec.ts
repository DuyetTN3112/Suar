import { test } from '@japa/runner'

import { LucidOrganizationSearchDocumentReader } from '#modules/organizations/infra/adapters/directory/lucid_organization_search_document_reader'
import { SearchOrganizationsViaEngineQuery } from '#modules/search/actions/queries/entity-search/search_organizations_via_engine_query'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { cleanupTestData, OrganizationFactory } from '#tests/helpers/factories'

test.group('Integration | Organization Search Engine', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('retrieves active organizations by indexed keyword', async ({ assert }) => {
    const { org: matchingOrg } = await OrganizationFactory.createWithOwner({
      name: 'Elastic Labs',
      slug: 'elastic-labs',
      plan: null,
    })
    await matchingOrg.merge({ description: 'Search platform research collective' }).save()

    const [{ OrganizationSearchDocumentBuilder }, { OrganizationSearchIndexRepository }, { searchClient }] =
      await Promise.all([
        import('#modules/search/infra/adapters/entity-search/organizations/organization_search_document_builder'),
        import('#modules/search/infra/repositories/entity-search/organizations/organization_search_index_repository'),
        import('#platform/search/elasticsearch_client'),
      ])

    const repository = new OrganizationSearchIndexRepository()
    const builder = new OrganizationSearchDocumentBuilder(
      new LucidOrganizationSearchDocumentReader()
    )

    await repository.resetIndex()
    await repository.ensureIndex()
    await repository.upsertDocument(await builder.build(matchingOrg.id))
    await searchClient.indices.refresh({ index: repository.indexName })

    const result = await new SearchOrganizationsViaEngineQuery(repository).handle({
      q: 'elastic',
      limit: 5,
    })

    assert.deepEqual(result.map((item) => item.organizationId), [matchingOrg.id])
  }).timeout(10000)
})
